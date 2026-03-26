Feature: Daily Tasks

  Background:
    Given the user is logged in
    And the user is on the Daily Tasks page

  Scenario: Page shows daily tasks title and count
    Then the page title is visible
    And the task count badge is displayed

  Scenario: Lists tasks due today and overdue
    Given there are tasks due today
    Then today's tasks are listed

  Scenario: Does not show future tasks
    Given there are tasks due in the future
    Then future tasks are not shown in the daily list

  Scenario: Does not show completed tasks
    Given there are completed tasks
    Then completed tasks are not shown in the daily list

  Scenario: Shows "All caught up!" when no tasks due
    Given there are no tasks due today
    Then the "All caught up" message is visible

  Scenario: Overdue task dates shown in red
    Given there are overdue tasks
    Then overdue dates are styled in red

  Scenario: Today's task dates shown in orange/amber
    Given there are tasks due today
    Then today's dates are styled in amber

  Scenario: Task status badges displayed
    Given there are active daily tasks
    Then each task shows its status badge

  Scenario: Loading spinner during fetch
    When the page is loading
    Then a loading spinner is visible
