require File.join(File.dirname(__FILE__), 'spec_helper')

describe " add an instance " do
  before(:each) do
    login('edcadmin', 'secret')
    page.find("a.add.dialog").click
  end

  it "creates an activity stream when a gpdb instance is created" do
    create_gpdb_gillette_instance(:name => "gpdb_instance")
    gpdb_instance_id = Instance.find_by_name("gpdb_instance").id
    go_to_home_page
    page.should have_content "EDC Admin added a new instance gpdb_instance"
    sleep(3)
    go_to_instance_page
    within(".instance_provider") do
      page.find("li[data-greenplum-instance-id='#{gpdb_instance_id}']").click
    end
    page.should have_content "EDC Admin added a new instance gpdb_instance"
    go_to_user_list_page
    within(".list") do
      click_link "EDC Admin"
    end
    page.should have_content "EDC Admin added a new instance gpdb_instance"
  end

  it "System generates events for gpdb name change (INSTANCE_CHANGED_NAME)" do
    name = "initial_instance_name"
    modified_name = "edit_instance_name"

    create_gpdb_gillette_instance(:name => name)
    gpdb_instance_id = Instance.find_by_name(name).id
    go_to_home_page
    page.should have_content "EDC Admin added a new instance #{name}"
    sleep(3)
    go_to_instance_page
    within(".instance_provider") do
      page.find("li[data-greenplum-instance-id='#{gpdb_instance_id}']").click
    end
    page.should have_content "EDC Admin added a new instance #{name}"
    go_to_user_list_page
    within(".list") do
          click_link "EDC Admin"
    end
    page.should have_content "EDC Admin added a new instance #{name}"
  end

  xit "creates an activity stream when a hadoop instance is created" do
    create_valid_hadoop_instance(:name => "hadoop_instance")
    variable = Instance.find_by_name("hadoop_instance")
    hadoop_instance_id = variable.id
    go_to_home_page
    page.should have_content "EDC Admin added a new instance hadoop_instance"
    sleep(3)
    go_to_instance_page
    within(".instance_provider") do
      page.find("li[data-hadoop-instance-id='#{hadoop_instance_id}']").click
    end
    page.should have_content "EDC Admin added a new instance hadoop_instance"
    go_to_user_list_page
    within(".list") do
      click_link "EDC Admin"
    end
    page.should have_content "EDC Admin added a new instance hadoop_instance"
  end

end
