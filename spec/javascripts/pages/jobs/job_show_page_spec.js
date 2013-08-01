describe("chorus.pages.JobsShowPage", function () {
    beforeEach(function () {
        this.model = backboneFixtures.job();
        this.task = this.model.tasks().at(0);
        this.workspace = this.model.workspace();
        this.page = new chorus.pages.JobsShowPage(this.workspace.id, this.model.get('id'));
    });

    it("should have the right constructor name", function () {
        expect(this.page.constructorName).toBe("JobsShowPage");
    });

    context("after the fetch completes", function () {
        beforeEach(function() {
            this.server.completeFetchFor(this.model);
        });

        it("should create the subnav on the jobs tab", function () {
            expect(this.page.subNav).toBeA(chorus.views.SubNav);
        });

        it("creates main content", function () {
            expect(this.page.mainContent).toBeA(chorus.views.MainContentList);
        });

        it("displays the Job's name in the header", function () {
            var header = this.page.mainContent.contentHeader.$("h1");
            expect(header).toContainText(this.model.get('name'));
        });

        it("creates the correct content details", function() {
            expect(this.page.mainContent.contentDetails).toBeA(chorus.views.JobContentDetails);
            expect(this.page.mainContent.contentDetails.model.get("id")).toBe(this.model.get("id"));
        });

        describe("when the job_task:selected event is triggered on the list view", function () {
            beforeEach(function() {
                this.page.render();
                chorus.PageEvents.trigger("job_task:selected", this.task);
            });

            it("sets the resource of the sidebar", function() {
                expect(this.page.sidebar.model).toBe(this.task);
            });

            it('instantiates the sidebar view', function() {
                expect(this.page.sidebar).toBeDefined();
                expect(this.page.sidebar).toBeA(chorus.views.JobTaskSidebar);
                expect(this.page.$("#sidebar .sidebar_content.primary")).not.toBeEmpty();
            });

            describe("when job_task:selected event is triggered and there is already a sidebar", function() {
                beforeEach(function() {
                    this.oldSidebar = this.page.sidebar;
                    spyOn(this.page.sidebar, 'teardown');
                    chorus.PageEvents.trigger("job_task:selected", this.task);
                });

                it("tears down the old sidebar", function() {
                    expect(this.oldSidebar.teardown).toHaveBeenCalled();
                });
            });
        });

        describe("when invalidated is triggered on the model", function () {
            beforeEach(function () {
                this.page.render();
                spyOn(this.page.model, 'fetch');
            });

            it("refetches the model", function () {
                this.page.model.trigger('invalidated');
                expect(this.page.model.fetch).toHaveBeenCalled();
            });

        });

        describe("breadcrumbs", function() {
            it("renders home > Workspaces > {workspace name} > Jobs", function() {
                expect(this.page.$(".breadcrumb:eq(0) a").attr("href")).toBe("#/");
                expect(this.page.$(".breadcrumb:eq(0) a").text()).toMatchTranslation("breadcrumbs.home");

                expect(this.page.$(".breadcrumb:eq(1) a").attr("href")).toBe("#/workspaces");
                expect(this.page.$(".breadcrumb:eq(1) a").text()).toMatchTranslation("breadcrumbs.workspaces");

                expect(this.page.$(".breadcrumb:eq(2) a").attr("href")).toBe("#/workspaces/" + this.workspace.id);
                expect(this.page.$(".breadcrumb:eq(2) a").text()).toBe(this.workspace.get("name"));

                expect(this.page.$(".breadcrumb:eq(3)").text().trim()).toMatchTranslation("breadcrumbs.jobs");

                expect(this.page.$(".breadcrumb:eq(4)").text().trim()).toBe(this.model.get("name"));
            });
        });
    });
});