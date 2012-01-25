(function(ns) {
    ns.collections.WorkspaceSet = ns.collections.Base.extend({
        model : ns.models.Workspace,
        urlTemplate : "workspace/",

        urlParams : function() {
            var params = {};

            if(this.attributes.active) {
                params.active = true;
            }

            if(this.attributes.user) {
                params.user = this.attributes.user.get("id");
            }

            if(this.attributes.showLatestComments) {
                params.showLatestComments = true;
            }

            return params;
        }
    });
})(chorus);
