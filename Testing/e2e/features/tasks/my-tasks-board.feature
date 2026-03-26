Feature: My Tasks - Board View

  Background:
    Given the user is logged in
    And the user is on the My Tasks page

  Scenario: Toggle from list to board view
    When the user clicks the board view button
    Then the board view is displayed

  Scenario: Board shows columns for each status
    When the user is in board view
    Then columns for "To Do", "In Progress", "Blocked", and "Complete" are visible

  Scenario: Tasks appear in correct status columns
    When the user is in board view
    Then tasks are grouped by their status in the correct columns

  Scenario: Toggle back to list view preserves tasks
    When the user switches to board view
    And the user switches back to list view
    Then the same tasks are still visible
