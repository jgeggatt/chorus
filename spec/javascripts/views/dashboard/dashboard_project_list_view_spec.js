describe("chorus.views.DashboardProjectList", function() {
    beforeEach(function() {
        // Has a summary, but no insights, and user is a member
        this.workspace1 = backboneFixtures.workspace({
            name: "Broccoli",
            owner: { firstName: 'Green', lastName: 'Giant' },
            latestCommentList: [],
            summary: 'We are making sails!',
            isMember: true
        });
        delete this.workspace1.attributes.latestInsight;

        // One insight, no summary, and the user is not a member
        this.workspace2 = backboneFixtures.workspace({
            name: "Camels",
            owner: { firstName: 'Andre', lastName: 'The Giant' },
            latestCommentList: [],
            numberOfInsights: 1,
            isMember: false
        });
        delete this.workspace2.attributes.summary;
        spyOn(this.workspace2, 'latestInsight').andReturn(backboneFixtures.activity.insightOnGreenplumDataSource());

        // Three insights and a summary, and user is a member
        this.workspace3 = backboneFixtures.workspace({numberOfInsights: 3, isMember: true});
        spyOn(this.workspace3, 'latestInsight').andReturn(backboneFixtures.activity.insightOnGreenplumDataSource());

        this.collection = new chorus.collections.WorkspaceSet([this.workspace1, this.workspace2, this.workspace3]);
        this.collection.loaded = true;
        this.view = new chorus.views.DashboardProjectList({collection: this.collection});
    });

    describe("#render", function() {
        beforeEach(function() {
            this.view.noFilter = true;
            this.view.render();
        });

        it("displays the name of the workspace as a link", function() {
            expect(this.view.$(".project_name span").eq(0).text()).toBe("Broccoli");
            expect(this.view.$(".project_name").eq(0).attr('href')).toBe(this.workspace1.showUrl());

            expect(this.view.$(".project_name span").eq(1).text()).toBe("Camels");
            expect(this.view.$(".project_name").eq(1).attr('href')).toBe(this.workspace2.showUrl());
        });

        it("displays the name of the owners as a link", function() {
            expect(this.view.$(".owner").eq(0).text()).toBe("Green Giant");
            expect(this.view.$(".owner").eq(0).attr('href')).toBe(this.workspace1.owner().showUrl());

            expect(this.view.$(".owner").eq(1).text()).toBe("Andre The Giant");
            expect(this.view.$(".owner").eq(1).attr('href')).toBe(this.workspace2.owner().showUrl());
        });

        it("shows info icons only for projects with summaries", function () {
            expect(this.view.$('.info_icon').length).toBe(this.collection.length - 1);
        });

        describe("latest insight section", function () {
            it("shows the latest insight", function () {
                var presenter = new chorus.presenters.Activity(this.workspace2.latestInsight());
                var insightHtml = presenter.headerHtml().string;

                expect(this.view.$('.dashboard_project_card:eq(2) .activity .activity_header')).toContainHtml(insightHtml);
            });

            it("does not show an insight if there are no insights", function () {
                expect(this.view.$('.insight_zone .activity_item').length).toBe(this.collection.length - 1);
            });

            it("shows a link to all insights if there are more", function () {
                expect(this.view.$('.dashboard_project_card:eq(0) a.all_insights')).not.toExist();

                expect(this.view.$('.dashboard_project_card:eq(2) a.all_insights').text()).toContainTranslation('project_card.insight.all_insights', {count: 2});
                expect(this.view.$('.dashboard_project_card:eq(2) a.all_insights').attr('href')).toBe(this.workspace3.showUrl()+'?filter=insights');
            });

            describe("an activity with comments", function () {
                it("displays the comment, with no 'read more'", function () {
                    expect(this.view.$('.truncated_text')).toContainText(this.workspace2.latestInsight().get('body'));
                    expect(this.view.$('.truncated_text .more')).not.toExist();
                });
            });
        });

        describe("filtering", function () {
            context("when filter:members_only is triggered on the collection", function () {
                beforeEach(function () {
                    this.collection.trigger('filter:members_only');
                    this.renderedProjects = _.map(this.view.projectCards, function (view) {
                        return view.model;
                    });
                });

                it("renders only cards for workspaces that the current user is a member of", function () {
                    expect(this.renderedProjects).toContain(this.workspace1);
                    expect(this.renderedProjects).not.toContain(this.workspace2);
                    expect(this.renderedProjects).toContain(this.workspace3);
                });

                context("and then filter:all is triggered on the collection", function () {
                    beforeEach(function () {
                        this.collection.trigger('filter:all');
                        this.renderedProjects = _.map(this.view.projectCards, function (view) {
                            return view.model;
                        });
                    });

                    it("renders cards for all workspaces in the collection", function () {
                        expect(this.renderedProjects).toContain(this.workspace1);
                        expect(this.renderedProjects).toContain(this.workspace2);
                        expect(this.renderedProjects).toContain(this.workspace3);
                    });
                });
            });
        });
    });
});