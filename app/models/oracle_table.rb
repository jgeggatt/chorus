class OracleTable < OracleDataset
  def verify_in_source(user)
    schema.connect_as(user).table_exists?(name)
  end
end