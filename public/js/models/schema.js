;(function(ns) {
    ns.models.Schema = ns.models.Base.extend({
        urlTemplate: "/data/{{instanceId}}/database/{{databaseName}}/schema/{{schemaName}}",

        functions: function() {
            this._schemaFunctions = this._schemaFunctions || new ns.collections.SchemaFunctionSet([], {
                instanceId: this.get("instanceId"),
                databaseId: this.get("databaseId"),
                schemaId: this.get("id"),
                schemaName: this.get('name')
            });
            return this._schemaFunctions;
        },

        tables: function() {
            if(!this._tables) {
                this._tables = new chorus.collections.DatabaseTableSet([], {
                    instanceId : this.get("instanceId"),
                    databaseName : this.get("databaseName"),
                    schemaName : this.get("name")
                });
            }
            return this._tables;
        },

        views: function() {
            if(!this._views) {
                this._views = new chorus.collections.DatabaseViewSet([], {
                    instanceId : this.get("instanceId"),
                    databaseName : this.get("databaseName"),
                    schemaName : this.get("name")
                });
            }
            return this._views;
        }
    }, {
        DEFAULT_NAME: "public"
    });
})(chorus);
