Feature: People Tab

  Background:
    Given the user is logged in
    And the user is on a project page

  Scenario: Switching to Team tab shows people list
    When the user clicks the "Team" tab
    Then the people list is visible

  Scenario: People list is searchable
    When the user clicks the "Team" tab
    And the user searches for a person by name
    Then the filtered results are shown

  Scenario: People list shows status badges
    When the user clicks the "Team" tab
    Then each person row shows a status badge
