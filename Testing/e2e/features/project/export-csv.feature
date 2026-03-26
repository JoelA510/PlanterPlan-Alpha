Feature: Export CSV

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Export button visible in project header
    Then the export button is visible in the project header

  Scenario: Clicking export triggers CSV download
    When the user clicks the export button
    Then a CSV file download is triggered

  Scenario: CSV export contains correct headers
    Given the user is on a project page with tasks
    When the user clicks the export button
    Then the CSV file contains expected column headers

  Scenario: CSV export includes all visible tasks
    Given the user is on a project page with tasks
    When the user clicks the export button
    Then the CSV row count matches the visible task count

  Scenario: CSV handles special characters in task names
    Given the user is on a project page with tasks containing special characters
    When the user clicks the export button
    Then the CSV file is properly escaped and formatted

  Scenario: Export empty project shows headers only
    Given the user is on a project page with no tasks
    When the user clicks the export button
    Then the CSV file contains only the header row
