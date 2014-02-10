chorus.dialogs.InsightsNew = chorus.dialogs.MemoNew.extend({
    title:t("insight.new_dialog.title"),
    placeholder: t("insight.placeholder"),
    submitButton: t("insight.button.create"),

    events: {
        "click button.submit": "save"
    },

    makeModel:function () {
        this.model = new chorus.models.Insight({
            entityType: this.options.entityType,
            entityId: this.options.entityId,
            workspaceId: this.options.workspaceId
        });
        this._super("makeModel", arguments);
    },

    saved: function() {
        analytics.track('Insight Created');  // Segment.io integration
        this._super("saved", arguments);
    }
});
