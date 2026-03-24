Feature: Pipeline Board

  Background:
    Given the user is logged in
    And the user has existing projects
    And the user is on the dashboard

  Scenario: Pipeline board shows columns for each project status
    Then the pipeline board has columns for "Planning", "In Progress", "Launched", and "Paused"

  Scenario: Project cards display title, status, and progress
    Then project cards are visible in the pipeline columns
    And each project card shows a title

  Scenario: Drag project card between pipeline columns changes status
    When the user drags a project card from "Planning" to "In Progress"
    Then the project card appears in the "In Progress" column

  Scenario: Failed status change shows toast and reverts
    When the pipeline status change fails
    Then an error toast appears
    And the project card reverts to the original column
