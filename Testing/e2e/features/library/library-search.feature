Feature: Library Search

  Background:
    Given the user is logged in
    And the user is on a project page

  Scenario: Library search appears in task creation form
    When the user opens the task creation form
    Then the library search input is visible

  Scenario: Typing filters library templates
    When the user opens the task creation form
    And the user types in the library search
    Then matching template results appear

  Scenario: Selecting library template populates form
    When the user opens the task creation form
    And the user selects a library template
    Then the task form fields are populated with the template data

  Scenario: Creating task from library template clones it
    When the user creates a task from a library template
    Then the new task is created with the template's data
    And a success toast appears
