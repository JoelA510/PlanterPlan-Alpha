Feature: Task Details Panel

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Panel opens on task click showing task details
    When the user clicks on a task
    Then the task details panel is visible
    And the panel displays the task title

  Scenario: Panel shows task title, description, status, and dates
    When the user clicks on a task with full details
    Then the panel shows the task description
    And the panel shows the task status
    And the panel shows dates if set

  Scenario: Edit button switches to form mode
    When the user clicks on a task
    And the user clicks the edit button
    Then the panel shows the task edit form

  Scenario: Close button closes the panel
    When the user clicks on a task
    And the user clicks the close button on the panel
    Then the task details panel is hidden

  Scenario: Panel title updates based on mode
    When the user clicks on a task
    Then the panel title reflects "Details" mode
    When the user clicks the edit button
    Then the panel title reflects "Edit" mode

  Scenario: Delete task from details panel
    When the user clicks on a task
    And the user clicks the delete button in the panel
    Then the task is removed

  Scenario: Library search available in create mode
    When the user opens the task creation form
    Then the library search input is visible
