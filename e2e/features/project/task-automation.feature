Feature: Task Automation
  As a project owner automated behaviors keep my project consistent

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Marking parent complete auto-marks children complete
    When the user marks a parent task as complete
    Then all child tasks are also marked complete
    And a success toast appears

  Scenario: Child task due dates roll up to parent milestone
    Given a milestone has child tasks with due dates
    Then the milestone due date is at or after the latest child due date

  Scenario: Dependency prompt when completing task with outstanding dependents
    When the user tries to complete a task with unfinished prerequisites
    Then a warning or error is displayed
