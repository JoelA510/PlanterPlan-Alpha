Feature: Task Resources
  As a project member I can manage task resource attachments

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Resources section is visible in task details
    When the user clicks on a task
    Then the task details panel opens
    And the resources section is visible

  Scenario: Task with resources displays resource list
    When the user clicks on a task with resources
    Then the resources list shows resource items
    And each resource shows its type and name

  Scenario: Add a link resource to a task
    When the user clicks on a task
    And the user adds a link resource
    Then the resource appears in the resources list

  Scenario: Remove a resource from a task
    When the user clicks on a task with resources
    And the user removes a resource
    Then the resource is no longer displayed

  Scenario: Resource types are correctly indicated
    When the user clicks on a task with resources
    Then each resource displays an icon matching its type
