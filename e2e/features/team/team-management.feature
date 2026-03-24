Feature: Team Management

  Background:
    Given the user is logged in
    And the user is on the Team page for a project

  Scenario: Add Member button visible with project context
    Then the "Add Member" button is visible

  Scenario: Add member modal opens with name, email, role fields
    When the user clicks "Add Member"
    Then the add member modal is visible
    And the modal has name, email, and role fields

  Scenario: Submit add member form creates new member
    When the user clicks "Add Member"
    And the user fills in member name "John Doe"
    And the user fills in member email "john@example.com"
    And the user submits the form
    Then the member "John Doe" appears in the team list

  Scenario: Cancel button closes add member modal
    When the user clicks "Add Member"
    And the user clicks cancel
    Then the add member modal is closed

  Scenario: Remove member via dropdown menu
    Given the project has team members
    When the user opens the menu for a member
    And the user clicks "Remove"
    Then the member is removed from the list

  Scenario: Member card disappears after removal
    Given the project has team members
    When the user removes a member
    Then the member card is no longer visible
