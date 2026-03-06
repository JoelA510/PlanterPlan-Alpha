Feature: Project and Task Management
  As a product manager
  I want to create projects and tasks
  So that I can effectively track my team's work

  Scenario: Creating a new project
    Given I am logged in as a normal user
    When I navigate to the dashboard
    And I click the "New Project" button
    And I fill in the project title with "Alpha Release"
    And I submit the project form
    Then I should see the project "Alpha Release" on the dashboard
    And the project status should be "Planning"

  Scenario: Adding a task to a project
    Given I have a project named "Alpha Release"
    When I open the project "Alpha Release"
    And I click "Add Task"
    And I fill in the task title with "Design Database Schema"
    And I save the task
    Then the task "Design Database Schema" should appear in the "To Do" column

  Scenario: Moving a task's status
    Given I have a task named "Design Database Schema" in "To Do"
    When I drag the task "Design Database Schema" to the "In Progress" column
    Then the task status should be updated to "In Progress"
