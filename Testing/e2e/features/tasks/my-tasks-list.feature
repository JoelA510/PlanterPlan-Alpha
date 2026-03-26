Feature: My Tasks - List View

  Background:
    Given the user is logged in
    And the user is on the My Tasks page

  Scenario: My Tasks page shows title
    Then the page title is visible

  Scenario: Lists all instance tasks assigned to user
    Given the user has tasks assigned
    Then task items are listed

  Scenario: Tasks show title and status badge
    Given the user has tasks assigned
    Then each task shows a title
    And each task shows a status badge

  Scenario: Empty state shown when no tasks exist
    Given the user has no tasks assigned
    Then the empty state message is visible

  Scenario: Loading spinner during data fetch
    When the page is loading
    Then a loading spinner is visible

  Scenario: Status change dropdown works on task items
    Given the user has tasks assigned
    When the user changes a task status via dropdown
    Then the task status is updated
