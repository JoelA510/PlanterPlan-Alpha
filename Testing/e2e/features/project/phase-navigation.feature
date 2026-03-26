Feature: Phase Navigation

  Background:
    Given the user is logged in
    And the user is on a project page

  Scenario: Multiple phase cards shown horizontally
    Then multiple phase cards are displayed in a horizontal row

  Scenario: Clicking different phase updates milestone display
    When the user clicks phase card 2
    Then milestones for phase 2 are displayed
    When the user clicks phase card 1
    Then milestones for phase 1 are displayed

  Scenario: First phase is selected by default
    Then phase card 1 is selected by default
