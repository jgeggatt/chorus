(function($, ns) {
    ns.views.WorkspaceDetail = ns.views.Base.extend({
        className : "workspace_detail",

         setup : function() {
            this.collection = this.model.activities();
            this.collection.fetch();
            this.collection.bind("changed", this.render, this);
            this.activityList = new ns.views.ActivityList({
                collection : this.collection ,
                headingText: t("workspace.activity"),
                additionalClass : "workspace_detail",
                displayStyle : "without_workspace"
            });
        },

        postRender : function() {
            this.activityList.el = this.$(".activities");
            this.activityList.delegateEvents();
            this.activityList.render();
        }
    });
})(jQuery, chorus);
