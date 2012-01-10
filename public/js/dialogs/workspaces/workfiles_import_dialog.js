(function($, ns) {
    ns.WorkfilesImport = chorus.dialogs.Base.extend({
        className : "workfiles_import",
        title : t("workfiles.import_dialog.title"),

        persistent: true,

        events : {
            "click button.submit" : "upload",
            "submit form": "upload"
        },

        makeModel : function() {
            this.model = this.model || new chorus.models.Workfile({workspaceId : this.options.launchElement.data("workspace-id")})
        },

        setup : function() {
            var self = this;
            $(document).one('close.facebox', function() {
                if (self.request) {
                    self.request.abort();
                }
            });
        },

        upload : function(e) {
            if(e) {e.preventDefault();}
            if (this.uploadObj) {
                this.request = this.uploadObj.submit();
                this.$("button.submit").startLoading("workfiles.import_dialog.uploading");
            }
        },

        closeModal: function(e) {
            if (e) { e.preventDefault(); }
            if (this.request) { this.request.abort(); }
            this._super("closeModal");
        },

        chooseFile : function(e) {
            e.preventDefault();
            this.$("input").click();
        },

        postRender : function() {
            var self = this;

            // dataType: 'text' is necessary for FF3.6
            // see https://github.com/blueimp/jQuery-File-Upload/issues/422
            // see https://github.com/blueimp/jQuery-File-Upload/blob/master/jquery.iframe-transport.js
            this.$("input[type=file]").fileupload({
                change : fileChosen,
                add : fileChosen,
                done : uploadFinished,
                dataType : "text"
            });

            function fileChosen(e, data) {
                if (data.files.length > 0) {
                    self.$(".defaultText").addClass("hidden");
                    self.$("button.submit").removeAttr("disabled");
                    self.uploadObj = data;
                    var filename = data.files[0].name;
                    self.uploadExtension = _.last(filename.split('.'));
                    var iconSrc = chorus.urlHelpers.fileIconUrl(self.uploadExtension, "medium");
                    self.$('img').attr('src', iconSrc);
                    self.$('.fileName').text(filename).attr('title',filename);
                    self.$("form").addClass("chosen");
                }
            }

            function uploadFinished(e, data) {
                var json = $.parseJSON(data.result)
                if (json.status == "ok") {
                    self.model = new chorus.models.Workfile(json.resource[0]);
                    chorus.toast('workfiles.uploaded', {fileName: self.model.get("fileName")});
                    self.closeModal();

                    var url, options;
                    if (self.model.isText() || self.model.isImage()) {
                        url = self.model.showUrl();
                    } else {
                        url = self.model.workfilesUrl();
                        options = { workfileId : self.model.get("id") };
                    }

                    chorus.router.navigate(url, true, options);
                }
                else {
                    e.preventDefault();
                    self.resource.serverErrors = json.message;
                    self.$("button.submit").stopLoading();
                    self.$("button.submit").attr("disabled", "disabled");

                    // $.text(val) clears the selected element, so .text here kills the spinner inside the button.

                    self.resource.trigger("saveFailed");
                }
            }
        }
    });
})(jQuery, chorus.dialogs);
