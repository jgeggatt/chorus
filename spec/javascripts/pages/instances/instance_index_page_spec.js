describe("chorus.pages.InstanceIndexPage", function() {
    beforeEach(function() {
        this.page = new chorus.pages.InstanceIndexPage();
    });

    describe("#initialize", function() {
        it("has a helpId", function() {
            expect(this.page.helpId).toBe("instances");
        });

        it("fetches all registered greenplum instances", function() {
            expect(new chorus.collections.InstanceSet()).toHaveBeenFetched();
        });

        it("fetches all registered hadoop instances", function() {
            expect(new chorus.collections.HadoopInstanceSet()).toHaveBeenFetched();
        });

        it("passes the greenplumn and hadoop instances to the list view", function() {
            var list = this.page.mainContent.content;
            expect(list.options.hadoopInstances).toBeA(chorus.collections.HadoopInstanceSet);
            expect(list.options.greenplumInstances).toBeA(chorus.collections.InstanceSet);
        });
    });

    describe("when the instances are fetched", function() {
        beforeEach(function() {
            var instances = new chorus.collections.InstanceSet();
            this.server.completeFetchAllFor(instances, [
                newFixtures.instance.greenplum(),
                newFixtures.instance.greenplum({id: 123456})
            ]);
        });

        describe("pre-selection", function() {
            it("pre-selects the first item by default", function() {
                this.page.render();
                expect(this.page.mainContent.content.$(".greenplum_instance li.instance:eq(0)")).toHaveClass("selected");
            });

            it("pre-selects the instance with ID specified in chorus.pageOptions, when available", function() {
                this.page.pageOptions = {selectId: 123456};
                this.page.render();
                expect(this.page.mainContent.content.$(".greenplum_instance li.instance[data-instance-id='123456']")).toHaveClass("selected");
            });
        });

        describe("#render", function() {
            beforeEach(function() {
                chorus.bindModalLaunchingClicks(this.page);
                this.page.render();
            });

            it("launches a new instance dialog", function() {
                var modal = stubModals();
                this.page.mainContent.contentDetails.$("button").click();
                expect(modal.lastModal()).toBeA(chorus.dialogs.InstancesNew);
            });

            it("sets the page model when a 'instance:selected' event is broadcast", function() {
                var instance = newFixtures.instance.greenplum();
                expect(this.page.model).not.toBe(instance);
                chorus.PageEvents.broadcast('instance:selected', instance);
                expect(this.page.model).toBe(instance);
            });
        });
    });
});
