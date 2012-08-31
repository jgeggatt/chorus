require 'stale'

class SqlCommandFailed < Exception
end

class Dataset < ActiveRecord::Base
  include Stale

  belongs_to :schema, :class_name => 'GpdbSchema', :counter_cache => :datasets_count
  has_many :import_schedules, :foreign_key => 'source_dataset_id'
  has_many :imports, :foreign_key => 'source_dataset_id'
  delegate :gpdb_instance, :account_for_user!, :to => :schema
  delegate :definition, :to => :statistics
  validates_presence_of :name
  validates_uniqueness_of :name, :scope => :schema_id

  attr_accessor :statistics

  has_many :activities, :as => :entity
  has_many :events, :through => :activities
  has_many :associated_datasets
  has_many :bound_workspaces, :through => :associated_datasets, :source => :workspace
  has_and_belongs_to_many :events_notes, :class_name => 'Events::Note'

  scope :tables, where(:type => 'GpdbTable')
  scope :views, where(:type => 'GpdbView')
  scope :chorus_views, where(:type => 'ChorusView')

  delegate :with_gpdb_connection, :to => :schema
  delegate :gpdb_instance, :to => :schema

  attr_accessor :highlighted_attributes, :search_result_notes
  searchable :unless => :stale? do |s|
    s.text :name, :stored => true, :boost => SOLR_PRIMARY_FIELD_BOOST
    s.text :database_name, :stored => true, :boost => SOLR_SECONDARY_FIELD_BOOST
    s.text :schema_name, :stored => true, :boost => SOLR_SECONDARY_FIELD_BOOST
    s.text :column_name, :stored => true, :boost => SOLR_SECONDARY_FIELD_BOOST
    s.string :grouping_id
    s.string :type_name
  end

  has_shared_search_fields [
                               {:type => :integer, :method => :instance_account_ids, :options => {:multiple => true}}
                           ]

  def instance_account_ids
    schema.database.instance_account_ids
  end

  def self.search_permissions(current_user, search)
    search.build do
      any_of do
        without :type_name, Dataset.type_name
        account_ids = current_user.accessible_account_ids
        with :instance_account_ids, account_ids unless account_ids.blank?
      end
    end
  end

  def self.refresh(account, schema, options = {})
    found_datasets = []
    datasets_in_gpdb = schema.with_gpdb_connection(account, false) do |conn|
      conn.select_all(Query.new(schema).tables_and_views_in_schema.to_sql)
    end

    datasets_in_gpdb.each do |attrs|
      type = attrs.delete('type')
      klass = type == 'r' ? GpdbTable : GpdbView
      dataset = klass.find_or_initialize_by_name_and_schema_id(attrs['name'], schema.id)
      found_datasets << dataset
      attrs.merge!(:stale_at => nil) if dataset.stale?
      dataset.assign_attributes(attrs, :without_protection => true)
      begin
        dataset.save if dataset.changed?
      rescue ActiveRecord::RecordNotUnique
      end
    end

    if options[:mark_stale]
      (schema.datasets.not_stale - found_datasets).each do |dataset|
        dataset.update_attributes!({:stale_at => Time.now}, :without_protection => true) unless dataset.type == 'ChorusView'
      end
    end
  end

  def self.find_and_verify_in_source(dataset_id, user)
    dataset = Dataset.find(dataset_id)
    dataset.verify_in_source(user)
    dataset
  end

  def verify_in_source(user)
    account = account_for_user!(user)
    with_gpdb_connection(account) do |conn|
      begin
        conn.exec_query("EXPLAIN SELECT 1 FROM \"#{schema.name}\".\"#{name}\"")
      rescue ActiveRecord::StatementInvalid
        raise ActiveRecord::RecordNotFound
      end
    end
  end

  def source_dataset_for(workspace)
    schema_id != workspace.sandbox_id
  end

  def add_metadata!(account)
    result = schema.with_gpdb_connection(account) do |conn|
      conn.select_all(Query.new(schema).metadata_for_dataset(name).to_sql)
    end.first
    @statistics = DatasetStatistics.new(result)
  end

  def self.with_name_like(name)
    if name.present?
      where("name ILIKE ?", "%#{name}%")
    else
      scoped
    end
  end

  def database_name
    schema.database.name
  end

  def schema_name
    schema.name
  end

  def column_name
    column_data.map(&:name)
  end

  def column_data
    GpdbColumn.columns_for(schema.database.gpdb_instance.owner_account, self)
  end

  def dataset_consistent?(another_dataset)
    another_column_data = another_dataset.column_data
    my_column_data = column_data

    consistent_size = my_column_data.size == another_column_data.size

    consistent_size && my_column_data.all? do |column|
      another_column = another_column_data.find do |another_column|
        another_column.name == column.name
      end

      another_column && another_column.data_type == column.data_type
    end
  end

  def type_name
    'Dataset'
  end

  def import(params, user)
    event = create_import_event(params, user)

    import_attributes =
        params.slice(:workspace_id, :to_table, :new_table, :sample_count, :truncate).merge(
            :user_id => user.id,
            :dataset_import_created_event_id => event.id)

    if params[:import_type] == "schedule" # scheduled imports
      import_schedules.create!(import_attributes, :without_protection => true) do |schedule|
        schedule.start_datetime = Time.parse(params[:schedule_start_time]) # adds local timezone
        schedule.end_date = params[:schedule_end_time]
        schedule.frequency = params[:schedule_frequency].downcase
        schedule.set_next_import
      end
    else # immediate imports
      import = imports.create!(import_attributes, :without_protection => true)
      QC.enqueue("Import.run", import.id)
    end
  end

  def preview_sql
    all_rows_sql(100)
  end

  def all_rows_sql(limit = nil)
    Arel::Table.new(name).project('*').take(limit).to_sql
  end

  class Query
    def initialize(schema)
      @schema = schema
    end

    attr_reader :schema

    VIEWS = Arel::Table.new("pg_views")
    SCHEMAS = Arel::Table.new("pg_namespace")
    RELATIONS = Arel::Table.new("pg_catalog.pg_class")
    PARTITIONS = Arel::Table.new("pg_partitions")
    PARTITION_RULE = Arel::Table.new("pg_partition_rule")
    DESCRIPTIONS = Arel::Table.new("pg_description")
    EXT_TABLES = Arel::Table.new("pg_exttable")
    LAST_OPERATION = Arel::Table.new("pg_stat_last_operation")

    DISK_SIZE = <<-SQL
    CASE WHEN position('''' in pg_catalog.pg_class.relname) > 0 THEN 'unknown'
         WHEN position('\\\\' in pg_catalog.pg_class.relname) > 0 THEN 'unknown'
         ELSE pg_size_pretty(pg_total_relation_size(pg_catalog.pg_class.oid))
    END
    SQL

    TABLE_TYPE = <<-SQL
    CASE WHEN pg_catalog.pg_class.relhassubclass = 't' THEN 'MASTER_TABLE'
         WHEN pg_exttable.location is NULL THEN 'BASE_TABLE'
         WHEN position('gphdfs' in pg_exttable.location[1]) > 0 THEN 'HD_EXT_TABLE'
         WHEN position('gpfdist' in pg_exttable.location[1]) > 0 THEN 'EXT_TABLE'
         ELSE 'EXT_TABLE'
    END
    SQL

    def relations_in_schema
      schema_ids = SCHEMAS.where(SCHEMAS[:nspname].eq(schema.name)).project(:oid)
      RELATIONS.where(RELATIONS[:relnamespace].in(schema_ids))
    end

    def tables_and_views_in_schema
      relations_in_schema.where(RELATIONS[:relkind].in(['r', 'v'])).
          join(PARTITION_RULE, Arel::Nodes::OuterJoin).
          on(
          RELATIONS[:oid].eq(PARTITION_RULE[:parchildrelid]).
              and(RELATIONS[:relhassubclass].eq('f'))
      ).
          where(
          RELATIONS[:relhassubclass].eq('t').or(PARTITION_RULE[:parchildrelid].eq(nil))
      ).project(
          RELATIONS[:relkind].as('type'),
          RELATIONS[:relname].as('name'),
          RELATIONS[:relhassubclass].as('master_table')
      )
    end

    def metadata_for_dataset(table_name)
      relations_in_schema.
          where(RELATIONS[:relname].eq(table_name)).
          join(DESCRIPTIONS, Arel::Nodes::OuterJoin).
          on(RELATIONS[:oid].eq(DESCRIPTIONS[:objoid])).
          join(VIEWS, Arel::Nodes::OuterJoin).
          on(VIEWS[:viewname].eq(RELATIONS[:relname])).
          join(LAST_OPERATION, Arel::Nodes::OuterJoin).
          on(
          LAST_OPERATION[:objid].eq(RELATIONS[:oid]).
              and(LAST_OPERATION[:staactionname].eq('ANALYZE'))
      ).
          join(EXT_TABLES, Arel::Nodes::OuterJoin).
          on(EXT_TABLES[:reloid].eq(RELATIONS[:oid])).
          project(
          (PARTITIONS.where(PARTITIONS[:schemaname].eq(schema.name).
                                and(PARTITIONS[:tablename].eq(table_name))).
              project(Arel.sql("*").count)
          ).as('partition_count'),
          RELATIONS[:reltuples].as('row_count'),
          RELATIONS[:relname].as('name'),
          DESCRIPTIONS[:description].as('description'),
          VIEWS[:definition].as('definition'),
          RELATIONS[:relnatts].as('column_count'),
          LAST_OPERATION[:statime].as('last_analyzed'),
          Arel.sql(DISK_SIZE).as('disk_size'),
          Arel.sql(TABLE_TYPE).as('table_type')
      )
    end
  end

  private

  def create_import_event(params, user)
    workspace = Workspace.find(params[:workspace_id])
    dst_table = workspace.sandbox.datasets.find_by_name(params[:to_table]) unless params[:new_table].to_s == "true"
    Events::DatasetImportCreated.by(user).add(
        :workspace => workspace,
        :source_dataset => self,
        :dataset => dst_table,
        :destination_table => params[:to_table]
    )
  end

end

