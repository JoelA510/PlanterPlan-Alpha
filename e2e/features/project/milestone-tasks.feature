Feature: Milestone and Task Display

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Milestones listed under active phase
    Then milestone sections are visible

  Scenario: Tasks listed under each milestone
    When the user expands a milestone
    Then tasks are listed under that milestone

  Scenario: Completed milestones filtered out when all tasks done
    Given all tasks in a milestone are completed
    Then that milestone is visually marked as complete

  Scenario: Task shows title, status, and assignee
    When the user views a task item
    Then the task title is visible
    And the task status badge is visible

  Scenario: Clicking a task opens task details panel
    When the user clicks on a task
    Then the task details panel opens
    And the panel shows the task title
