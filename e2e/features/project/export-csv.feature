Feature: Export CSV

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Export button visible in project header
    Then the export button is visible in the project header

  Scenario: Clicking export triggers CSV download
    When the user clicks the export button
    Then a CSV file download is triggered
