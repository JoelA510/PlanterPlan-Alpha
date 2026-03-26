Feature: Pillar 2 - Daily Loop (Task Completion & Priority)

  Background:
    Given the user is logged in

  Scenario: Navigate to active project and view tasks
    Given an active project with tasks exists
    When the user navigates to the project
    Then the task tree is visible with milestones and tasks

  Scenario: Board shows status-appropriate tasks
    Given the user is on a project board
    Then active and pending tasks are visible
    And completed tasks are not prominently displayed

  Scenario: Complete parent task cascades to children
    Given a parent task with child tasks exists
    When the user marks the parent task as complete
    Then a confirmation prompt appears
    When the user confirms completion
    Then the parent task is marked complete
    And all child tasks are marked complete
