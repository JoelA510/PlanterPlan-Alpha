Feature: My Tasks Drag and Drop

  Background:
    Given the user is logged in
    And the user is on the My Tasks page in board view

  Scenario: Drag task between status columns changes task status
    When the user drags a task from "To Do" column to "In Progress" column
    Then the task appears in the "In Progress" column
    And the task status is updated to "In Progress"

  Scenario: Task stays in new column after drag
    When the user drags a task to a new column
    And the user refreshes the page
    Then the task remains in the new column
