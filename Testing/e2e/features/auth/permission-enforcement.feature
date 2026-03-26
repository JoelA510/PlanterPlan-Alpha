Feature: Permission Enforcement
  As a system I enforce role-based access control

  Scenario: Viewer cannot edit project settings
    Given the user is logged in as a viewer
    And the user is on a project page
    Then the settings button is not visible
    And the edit controls are hidden

  Scenario: Viewer cannot delete tasks
    Given the user is logged in as a viewer
    And the user is on a project page with tasks
    When the user clicks on a task
    Then the delete button is not visible in task details

  Scenario: Limited user sees restricted view
    Given the user is logged in as a limited user
    And the user is on a project page
    Then only assigned tasks are visible
    And the invite button is not visible

  Scenario: Coach can view but not delete project
    Given the user is logged in as a coach
    And the user is on a project page
    Then the settings button is visible
    But the delete project option is not available

  Scenario: Editor can modify tasks
    Given the user is logged in as an editor
    And the user is on a project page with tasks
    When the user clicks on a task
    Then the edit button is visible in task details
    And the status can be changed

  Scenario: Owner has full access
    Given the user is logged in as an owner
    And the user is on a project page
    Then the settings button is visible
    And the invite button is visible
    And the export button is visible in the project header

  Scenario: Coach can view all tasks but cannot edit non-coaching tasks
    Given the user is logged in as a coach
    And the user is on a project page with tasks
    When the user clicks on a task
    Then the task details panel is visible
    But the edit button is hidden for non-coaching tasks

  Scenario: Limited user can edit only assigned tasks
    Given the user is logged in as a limited user
    And the user is on a project page with tasks
    When the user clicks on an assigned task
    Then the edit button is visible in task details
    When the user clicks on an unassigned task
    Then the edit button is not visible in task details
