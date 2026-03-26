Feature: Task Dependencies
  As a project owner I can manage task dependencies and phase unlocking

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Task dependencies section is visible in task details
    When the user clicks on a task
    Then the task details panel opens
    And the dependencies section is visible

  Scenario: Phase is locked when prerequisite is incomplete
    When the user views a locked phase
    Then the phase shows a locked indicator
    And the phase tasks cannot be started

  Scenario: Phase unlocks when prerequisite phase is completed
    When all tasks in the prerequisite phase are completed
    Then the dependent phase becomes unlocked
    And the phase no longer shows a locked indicator

  Scenario: Dependency chain displays correctly
    When the user clicks on a task with dependencies
    Then the task details panel shows prerequisite tasks
    And each prerequisite shows its completion status

  Scenario: Cannot complete task with incomplete dependencies
    When the user tries to complete a task with unfinished prerequisites
    Then a warning or error is displayed

  Scenario: Phase completion triggers next phase unlock
    When the user completes the last task in a phase
    Then the next sequential phase is automatically unlocked
