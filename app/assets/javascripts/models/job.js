chorus.models.Job = chorus.models.Base.extend({
    entityType: "Job",
    constructorName: "Job",
    showUrlTemplate: "workspaces/{{workspace.id}}/jobs/{{id}}",

    urlTemplate: function(options) {
        var action = options && options.job_action;
        if (action === 'run') {
            return 'jobs/{{id}}/run';
        } else if (action === 'kill') {
            return 'jobs/{{id}}/stop';
        } else {
            return 'workspaces/{{workspace.id}}/jobs/{{id}}';
        }
    },

    workspace: function() {
        if (!this._workspace && this.get("workspace")) {
            this._workspace = new chorus.models.Workspace(this.get("workspace"));
        }
        return this._workspace;
    },

    tasks: function () {
        if (!this._tasks) {
            this._tasks = new chorus.collections.JobTaskSet(this.get("tasks") || [], {parse: true});
            this.on('loaded saved', function () {
                this._tasks.reset(this.get("tasks"), {parse: true});
            });
        }

        return this._tasks;
    },

    moveTaskUp:   function (task) { this.moveTask(task, -1); },
    moveTaskDown: function (task) { this.moveTask(task, +1); },

    moveTask: function (task, direction) {
        var desired_id_order = this._tasks.chain().pluck('id').invoke('toString').value();
        var thisIndex = this._tasks.indexOf(task);

        chorus.arrayHelpers.swap(desired_id_order, thisIndex, thisIndex + direction);
        this.save({task_id_order: desired_id_order}, {wait: true});
    },

    runsOnDemand: function () {
        return this.get("intervalUnit") === "on_demand";
    },

    nextRunDate: function () {
        var startDate = this.get('nextRun');
        return startDate ? moment(startDate).zone(startDate) : moment().add(1, 'hour');
    },

    endRunDate: function () {
        var endDate = this.get('endRun');
        return endDate ? moment(endDate).zone(endDate) : moment().add(1, 'hour');
    },

    toggleEnabled: function (callbacks) {
        this.get('enabled') ? this.disable(callbacks) : this.enable(callbacks);
    },

    disable: function (callbacks) {
        this.save( {enabled: false}, _.extend({}, callbacks, { wait: true}) );
    },

    enable: function (callbacks) {
        this.save( {enabled: true}, _.extend({}, callbacks, { wait: true}) );
    },

    frequency: function () {
        if (this.runsOnDemand()) {
            return t("job.frequency.on_demand");
        } else {
            return t("job.frequency.on_schedule",
                {
                    intervalValue: this.get('intervalValue'),
                    intervalUnit: this.get('intervalUnit')
                }
            );
        }
    },

    run: function () {
        var name = this.name();
        function saveSucceeded(){ chorus.toast('job.running_toast', {jobName: name}); }
        function saveFailed(){ chorus.toast('job.not_running_toast', {jobName: name, toastOpts: {type: 'error'}}); }

        this.save(
            {},
            {job_action: 'run', method: 'create', success: saveSucceeded, error: saveFailed}
        );
    },

    stop: function () {
        var name = this.name();
        function saveSucceeded(){ chorus.toast('job.stopping_toast', {jobName: name}); }
        function saveFailed(){ chorus.toast('job.not_stopping_toast', {jobName: name, toastOpts: {type: 'error'}}); }

        this.save(
            {},
            {job_action: 'kill', method: 'create', success: saveSucceeded, error: saveFailed}
        );
    },

    isRunning: function () {
        return (this.get("status") === "running") || (this.get("status") === "enqueued");
    },

    isStopping: function () {
        return this.get('status') === 'stopping';
    },

    ableToRun: function () {
        return !(this.isStopping() || this.isRunning());
    },

    lastRunLinkKey: function () {
        return this.get('lastRunFailed') ? "job.show_errors" : "job.show_details";
    },

    owner: function() {
        if (!this._owner) {
            this._owner = new chorus.models.User(this.get("owner"));
        }
        return this._owner;
    }
});