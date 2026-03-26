Feature: Phase Unlocking
  As a project owner phases unlock sequentially as prerequisites are completed

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Completing all tasks in Phase 1 unlocks Phase 2
    When the user completes the last task in a phase
    Then the next sequential phase is automatically unlocked

  Scenario: Incomplete phase keeps next phase locked
    When the user views a locked phase
    Then the phase shows a locked indicator
    And the phase tasks cannot be started
