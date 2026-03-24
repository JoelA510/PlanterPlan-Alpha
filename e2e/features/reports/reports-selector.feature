Feature: Reports Project Selector

  Background:
    Given the user is logged in
    And the user is on the Reports page

  Scenario: Reports page without project shows "Select a Project" prompt
    Given no project is selected
    Then the "Select a Project" prompt is visible

  Scenario: Project dropdown lists all user projects
    When the user opens the project selector
    Then all user projects are listed

  Scenario: Selecting project loads reports for that project
    When the user selects a project from the dropdown
    Then the reports data for that project is displayed

  Scenario: Empty dropdown when no projects exist
    Given the user has no projects
    Then the project selector shows no options
