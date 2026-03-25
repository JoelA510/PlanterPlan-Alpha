Feature: Subtask Hierarchy
  As a project owner I can manage 5-level task hierarchy

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Subtask can be created under a task (5th level)
    When the user clicks on a task
    And the user clicks "Add Subtask" in the task details panel
    And the user fills in the subtask title "E2E Subtask"
    And the user submits the subtask form
    Then the subtask "E2E Subtask" appears under the parent task
    And a success toast appears

  Scenario: Subtask CRUD operations
    When the user creates a subtask "Subtask To Edit"
    Then the subtask "Subtask To Edit" is visible
    When the user edits the subtask title to "Subtask Edited"
    Then the subtask title is updated to "Subtask Edited"
    When the user deletes the subtask
    Then the subtask is removed

  Scenario: Milestones are visible and expanded by default on project load
    Then milestone sections are visible
    And tasks are listed under that milestone

  Scenario: Phase cannot be transformed into a milestone
    When the user clicks on a phase card
    Then the task type selector does not include "Milestone"
