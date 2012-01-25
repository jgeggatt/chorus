describe("chorus.views.InstanceList", function() {
    context("without instances", function() {
        beforeEach(function() {
            this.collection = new chorus.collections.InstanceSet();
            this.view = new chorus.views.InstanceList({collection: this.collection});
        });

        describe("#render", function() {
            beforeEach(function() {
                this.view.render();
            });

            it("renders empty text for each instance type", function() {
                expect(this.view.$(".greenplum_instance .no_instances").text().trim()).toMatchTranslation("instances.none");
                expect(this.view.$(".hadoop_instance .no_instances").text().trim()).toMatchTranslation("instances.none");
                expect(this.view.$(".other_instance .no_instances").text().trim()).toMatchTranslation("instances.none");
            });

        });
    });

    context("with instances", function() {
        beforeEach(function() {
            this.collection = new chorus.collections.InstanceSet();
            this.collection.add(fixtures.instance({instanceProvider : "Greenplum Database", name : "GP9"}));
            this.collection.add(fixtures.instance({instanceProvider : "Greenplum Database", name : "gP1"}));
            this.collection.add(fixtures.instance({instanceProvider : "Greenplum Database", name : "GP10"}));
            this.collection.add(fixtures.instance({instanceProvider : "Hadoop", name : "Hadoop9"}));
            this.collection.add(fixtures.instance({instanceProvider : "Hadoop", name : "hadoop1"}));
            this.collection.add(fixtures.instance({instanceProvider : "Hadoop", name : "Hadoop10"}));
            this.collection.add(fixtures.instance({instanceProvider : "Whatever9", name : "Whatever9"}));
            this.collection.add(fixtures.instance({instanceProvider : "Whatever1", name : "whatever1"}));
            this.collection.add(fixtures.instance({instanceProvider : "Whatever10", name : "Whatever10"}));

            this.view = new chorus.views.InstanceList({collection: this.collection});
        });

        describe("#render", function() {
            beforeEach(function() {
                this.view.render();
            });

            it("renders an item for each instance", function() {
                expect(this.view.$("li .instance").length).toBe(this.collection.length);
            });

            it("renders the three instance provider sections", function() {
                expect(this.view.$("div.instance_provider").length).toBe(3);
            });

            it("renders the details section in each instance provider section", function() {
                expect(this.view.$("div.instance_provider .details").length).toBe(3);
            });

            it("renders the greenplum instances in the correct instance div", function() {
                expect(this.view.$(".greenplum_instance li .instance").length).toBe(3);
            });

            it("renders the hadoop instances in the correct instance div", function() {
                expect(this.view.$(".hadoop_instance li .instance").length).toBe(3);
            });

            it("pre-selects the first instance", function() {
                expect(this.view.$("li:first-child")).toHaveClass("selected");
                expect(this.view.$("li.selected").length).toBe(1);
            });

            it("sorts each section in natural sort order", function() {
                expect(this.view.$(".greenplum_instance li:eq(0) .name").text().trim()).toBe("gP1")
                expect(this.view.$(".greenplum_instance li:eq(1) .name").text().trim()).toBe("GP9")
                expect(this.view.$(".greenplum_instance li:eq(2) .name").text().trim()).toBe("GP10")

                expect(this.view.$(".hadoop_instance li:eq(0) .name").text().trim()).toBe("hadoop1")
                expect(this.view.$(".hadoop_instance li:eq(1) .name").text().trim()).toBe("Hadoop9")
                expect(this.view.$(".hadoop_instance li:eq(2) .name").text().trim()).toBe("Hadoop10")

                expect(this.view.$(".other_instance li:eq(0) .name").text().trim()).toBe("whatever1")
                expect(this.view.$(".other_instance li:eq(1) .name").text().trim()).toBe("Whatever9")
                expect(this.view.$(".other_instance li:eq(2) .name").text().trim()).toBe("Whatever10")
            })

            context("when the selected instance is destroyed", function() {
                beforeEach(function() {
                    this.oldLength = this.collection.length;
                    // simplify destroy working right under test
                    this.collection.at(0).isNew = function() { return true; }
                    this.collection.at(0).destroy();
                });

                it("selects the next available instance", function() {
                    expect(this.view.$("li:first-child")).toHaveClass("selected");
                    expect(this.view.$("li.selected").length).toBe(1);
                });

                it("renders only the existing items", function() {
                    expect(this.collection.models.length).toBe(this.oldLength - 1);
                    expect(this.view.$("li .instance").length).toBe(this.oldLength - 1);
                });
            });

            describe("instance:added event", function() {
                beforeEach(function() {
                    this.newInstance = fixtures.instance({id: "1234567"});
                    spyOn(this.view.collection, "fetchAll");
                    this.view.trigger("instance:added", "1234567");
                });

                it("fetches the collection again", function() {
                    expect(this.view.collection.fetchAll).toHaveBeenCalled();
                });

                it("selects the li with a matching id when fetch completes", function() {
                    this.collection.add(this.newInstance);
                    this.view.render(); // re-renders when fetch completes

                    expect(this.view.$("li[data-instance-id=1234567]")).toHaveClass("selected");
                    expect(this.view.$("li.selected").length).toBe(1);
                });
            });

            describe("clicking on an instance", function() {
                beforeEach(function() {
                    this.eventSpy = jasmine.createSpy();
                    this.view.bind("instance:selected", this.eventSpy);
                    this.li2 = this.view.$('li:eq(1)');
                    this.li3 = this.view.$('li:eq(2)');
                    this.li2.click();
                });

                it("triggers the instance:selected event", function() {
                    expect(this.eventSpy).toHaveBeenCalledWith(this.collection.models[0]);
                });

                it("adds the selected class to that item", function() {
                    expect(this.li2).toHaveClass("selected");
                });

                describe("when the view re-renders", function() {
                    beforeEach(function() {
                        this.view.render();
                    });

                    it("selects the li that was previously clicked", function() {
                        this.li2 = this.view.$('li:eq(1)');
                        expect(this.li2).toHaveClass("selected");
                    });
                });

                context("clicking on the same instance again", function() {
                    beforeEach(function() {
                        this.li2.click();
                    });

                    it("does not raise the event again", function() {
                        expect(this.eventSpy.calls.length).toBe(1);
                    });
                });

                context("and then clicking on another instance", function() {
                    beforeEach(function() {
                        this.li3.click();
                    });

                    it("removes the selected class from the first li", function() {
                        expect(this.li2).not.toHaveClass("selected");
                    });
                });
            });
        });
    });

});
