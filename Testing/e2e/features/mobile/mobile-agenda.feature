Feature: Mobile Agenda
  As a mobile user I can see today's upcoming tasks

  Background:
    Given the user is logged in
    And the user is on a mobile device

  Scenario: Daily agenda card is visible
    When the user navigates to the daily tasks page
    Then the mobile agenda card is visible
    And today's tasks are listed

  Scenario: Empty state when no tasks for today
    Given the user has no tasks due today
    When the user navigates to the daily tasks page
    Then an empty state message is displayed

  Scenario: Completing a task from the agenda
    When the user navigates to the daily tasks page
    And the user marks a task as complete
    Then the task shows a completed status

  Scenario: Agenda refreshes with new tasks
    When the user navigates to the daily tasks page
    And a new task is assigned for today
    Then the agenda updates to show the new task
