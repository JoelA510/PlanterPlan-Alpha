Feature: Edit Project Settings

  Background:
    Given the user is logged in

  Scenario: Settings button visible only for owner or admin
    Given the user is a project owner
    And the user is on a project page
    Then the settings button is visible

  Scenario: Edit modal opens with current project data
    Given the user is on a project page
    When the user clicks the settings button
    Then the edit project modal is visible
    And the title field is pre-filled with the current project title

  Scenario: Edit project title and description
    Given the edit project modal is open
    When the user changes the title to "Updated Project Name"
    And the user changes the description to "Updated description"
    And the user saves changes
    Then the project header shows "Updated Project Name"

  Scenario: Edit project location
    Given the edit project modal is open
    When the user enters location "Austin, TX"
    And the user saves changes
    Then the project metadata shows "Austin, TX"

  Scenario: Change "Due Soon" threshold
    Given the edit project modal is open
    When the user changes the due soon threshold to "14"
    And the user saves changes
    Then the settings are updated successfully

  Scenario: Change launch date triggers date recalculation warning
    Given the edit project modal is open
    When the user changes the start date
    Then a warning about shifting incomplete tasks is displayed

  Scenario: Save changes updates project header
    Given the edit project modal is open
    When the user makes changes and saves
    Then the project header reflects the changes
    And a success toast appears

  Scenario: Cancel discards changes
    Given the edit project modal is open
    When the user makes changes and clicks cancel
    Then the modal closes
    And the project header is unchanged

  Scenario: Validation error shown for empty title
    Given the edit project modal is open
    When the user clears the title field
    And the user attempts to save
    Then a validation error is shown for the title field

  Scenario: Validation error shown for empty start date
    Given the edit project modal is open
    When the user clears the start date
    And the user attempts to save
    Then a validation error is shown for the date field
