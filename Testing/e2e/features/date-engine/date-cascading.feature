Feature: Date Cascading

  Background:
    Given the user is logged in

  Scenario: Project creation with template assigns dates to tasks within window
    When the user creates a project with a 30-day window
    Then all generated task dates fall within the 30-day window

  Scenario: Milestone dates encapsulate child task dates
    Given a project exists with tasks
    Then each milestone's start date is at or before its earliest child task
    And each milestone's due date is at or after its latest child task

  Scenario: Changing project start date recalculates all task dates
    Given a project exists with tasks
    When the user changes the project start date
    Then all incomplete task dates are shifted accordingly

  Scenario: Parent date rollup updates when child task date changes
    Given a project exists with tasks
    When a child task date is updated
    Then the parent's dates are recalculated to encapsulate all children
