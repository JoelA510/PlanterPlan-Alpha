Feature: Create Template

  Background:
    Given the user is logged in
    And the user is on the dashboard

  Scenario: Create template modal opens
    When the user clicks the "New Template" button
    Then a modal dialog is visible

  Scenario: Fill template title and description
    When the user opens the create template modal
    And the user enters template title "E2E Template"
    Then the title field contains "E2E Template"

  Scenario: Successful template creation navigates to template page
    When the user creates a new template "E2E Template"
    Then the user is redirected to a project page

  Scenario: Template appears in sidebar templates section
    When the user creates a new template "Sidebar Template"
    Then "Sidebar Template" appears in the sidebar templates section
