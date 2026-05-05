Feature: Create Project

  Background:
    Given the user is logged in
    And the user is on the dashboard

  Scenario: Click "New Project" opens create project modal
    When the user clicks the "New Project" button
    Then the create project modal is visible

  Scenario: Step 1 - default scaffold template is pre-selected
    When the user opens the create project modal
    Then a default template option is selected

  Scenario: Step 1 - select a database template
    When the user opens the create project modal
    And the user selects a template card
    Then the selected template is highlighted

  Scenario: Step 1 - search templates by keyword
    When the user opens the create project modal
    And the user searches templates for "Launch"
    Then matching templates are shown

  Scenario: Step 1 - no results message when search has no match
    When the user opens the create project modal
    And the user searches templates for "zzz_nonexistent"
    Then a no results message is shown

  Scenario: Step 2 - fill project name and description
    When the user opens the create project modal
    And the user advances to step 2
    And the user enters project name "E2E Test Project"
    And the user enters project description "Created by E2E test"
    Then the project name field contains "E2E Test Project"

  Scenario: Step 2 - Create button disabled when title is empty
    When the user opens the create project modal
    And the user advances to step 2
    Then the create button is disabled

  Scenario: Step 2 - Back button returns to step 1
    When the user opens the create project modal
    And the user advances to step 2
    And the user clicks Back
    Then the template selection is visible

  @release
  Scenario: Successful project creation navigates to project page
    When the user creates a new project "E2E Project"
    Then the user is redirected to a project page
    And the project title "E2E Project" is visible

  Scenario: Failed project creation shows toast error
    When the user attempts to create a project with invalid data
    Then an error toast appears

  Scenario: Modal closes after successful creation
    When the user creates a new project "Modal Close Test"
    Then the create project modal is not visible
