;(function(ns) {
    ns.models.Comment = ns.models.Base.extend({
        creator: function() {
            return new ns.models.User({
                id : this.get("creatorId"),
                firstName : this.get("creatorFirstName"),
                lastName : this.get("creatorLastName")
            });
        }
    });
})(chorus);
