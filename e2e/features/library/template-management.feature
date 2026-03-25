Feature: Template Management
  As an admin I can manage the master template library

  Background:
    Given the user is logged in as project owner

  Scenario: Admin creates a new template task in the master library
    Given the user navigates to the library page
    When the user clicks "Add Template"
    And the user fills in the template title "E2E New Template"
    And the user saves the template
    Then the template "E2E New Template" appears in the library list
    And a success toast appears

  Scenario: Admin edits an existing template directly
    Given the user navigates to the library page
    And a template exists in the library
    When the user clicks on the template to edit
    And the user changes the template title to "Updated Template"
    And the user saves the changes
    Then the template title is updated to "Updated Template"

  Scenario: Task shows in-library visual indicator
    Given the user is on a project page with tasks
    When a task was created from a library template
    Then the task shows a library origin indicator

  Scenario: Add project task to library
    Given the user is on a project page with tasks
    When the user clicks on a task
    And the user clicks "Add to Library"
    Then a success toast appears
    And the task is added to the master library
