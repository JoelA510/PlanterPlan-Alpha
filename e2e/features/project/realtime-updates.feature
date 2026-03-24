Feature: Realtime Updates
  As a team member I see live updates when others make changes

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Task status change is reflected in real time
    When another user changes a task status
    Then the task status updates without page refresh

  Scenario: New task appears in real time
    When another user creates a new task
    Then the new task appears in the task list without refresh

  Scenario: Task deletion is reflected in real time
    When another user deletes a task
    Then the task disappears from the list without refresh

  Scenario: Page reconnects after brief disconnection
    When the realtime connection is briefly interrupted
    Then the connection is re-established
    And the task list remains up to date
