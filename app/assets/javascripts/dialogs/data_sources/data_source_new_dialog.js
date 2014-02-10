chorus.dialogs.DataSourcesNew = chorus.dialogs.Base.extend({
    constructorName: "DataSourcesNew",
    templateName: "data_source_new",
    title: t("data_sources.new_dialog.title"),
    persistent: true,

    events: {
        "change select.data_sources": "showFieldset",
        "click a.close_errors": "clearServerErrors",
        "submit form": "createDataSource",
        "change input[name=high_availability]": 'toggleHighAvailability',
        "click a.connection_parameters": "launchConnectionParametersDialog"
    },

    postRender: function() {
        _.defer(_.bind(function() {
            chorus.styleSelect(this.$("select.data_sources"), { format: function(text, option) {
                var aliasedName = $(option).val();
                return '<span class='+ aliasedName +'></span>' + text;
            } });
            chorus.styleSelect(this.$("select.hdfs_version"), { format: function(text, option) {
                var aliasedName = $(option).attr("name");
                return '<span class='+ aliasedName +'></span>' + text;
            } });
        }, this));
    },

    makeModel: function () {
        this.model = this.model || new chorus.models.GpdbDataSource();
        this.listenTo(this.model, 'change', this.rewriteLink);
    },

    additionalContext: function() {
        var config = chorus.models.Config.instance();
        return {
            gnipConfigured:  config.get('gnipConfigured'),
            oracleConfigured:  config.get('oracleConfigured'),
            defaultGpdbFields: {dbName: "postgres"},
            parameterCount: {count: this.model.numberOfConnectionParameters()}
        };
    },

    showFieldset: function (e) {
        this.$(".data_sources_form").addClass("collapsed");
        var className = this.$("select.data_sources option:selected").attr("name");

        if(className.length) {
            this.$("." + className).removeClass("collapsed");
        }
        this.$("button.submit").prop("disabled", className === 'select_one');
        this.clearErrors();
    },

    rewriteLink: function () {
        this.$('a.connection_parameters').text(t('data_sources.dialog.connection_parameters', {count: this.model.numberOfConnectionParameters()}));
    },

    toggleHighAvailability: function (e) {
        e && e.preventDefault();

        if (this.$('input[name=high_availability]').prop('checked')) {
            this.$('input[name=port]').val('');
            this.$('[name=port]').prop('disabled', true).removeClass('required');
            this.$('label[name=host]').text(t('data_sources.dialog.name_service'));
        } else {
            this.$('[name=port]').prop('disabled', false).addClass('required');
            this.$('label[name=host]').text(t('data_sources.dialog.hadoop_host'));
        }
    },

    launchConnectionParametersDialog: function (e) {
        e && e.preventDefault();

        new chorus.dialogs.HdfsConnectionParameters({model: this.model}).launchModal();
    },

    createDataSource: function (e) {
        e && e.preventDefault();

        var values = this.fieldValues();
        this.resource = this.model = new (this.dataSourceClass())();
        this.listenTo(this.model, "saved", this.saveSuccess);
        this.listenTo(this.model, "saveFailed", this.saveFailed);
        this.listenTo(this.model, "validationFailed", this.saveFailed);

        this.$("button.submit").startLoading("data_sources.new_dialog.saving");
        this.model.save(values, {
            success: function() {
                analytics.track('Data Source Created', values);  // Segment.io integration
            },
            error: function(model, xhr, options) {
                analytics.track('Data Source Creation Error', {error: xhr.responseText});  // Segment.io integration
            }
        });
    },

    dataSourceClass: function() {
        var dataSourceType = this.$("select.data_sources option:selected").attr("name");
        if (dataSourceType === "register_existing_hdfs") {
            return chorus.models.HdfsDataSource;
        } else if (dataSourceType === "register_existing_gnip") {
            return chorus.models.GnipDataSource;
        } else if (dataSourceType === "register_existing_oracle") {
            return chorus.models.OracleDataSource;
        } else if (dataSourceType === "register_existing_jdbc") {
            return chorus.models.JdbcDataSource;
        } else {
            return chorus.models.GpdbDataSource;
        }
    },

    fieldValues: function() {
        var updates = {};
        var className = this.$("select.data_sources option:selected").attr("name");
        var inputSource = this.$("." + className);
        _.each(inputSource.find("input[type=text], input[type=hidden], input[type=password], textarea, select"), function (i) {
            var input = $(i);
            updates[input.attr("name")] = input.val().trim();
        });
        updates["isHawq"] = this.$("select.data_sources option:selected").attr("hawq");

        updates.ssl = !!inputSource.find("input[name=ssl]").prop("checked");
        updates.shared = !!inputSource.find("input[name=shared]").prop("checked");
        updates.highAvailability = !!inputSource.find("input[name=high_availability]").prop("checked");
        updates.connectionParameters = this.model.get('connectionParameters');
        return updates;
    },

    clearServerErrors : function() {
        this.model.serverErrors = {};
    },

    saveSuccess: function () {
        chorus.PageEvents.trigger("data_source:added", this.model);
        chorus.toast('data_sources.add.toast', {dataSourceName: this.model.name()});
        this.closeModal();
    }
});

