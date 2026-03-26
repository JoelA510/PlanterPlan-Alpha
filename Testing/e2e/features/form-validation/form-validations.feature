Feature: Form Validations

  Background:
    Given the user is logged in

  Scenario: Login form - invalid email shows error
    Given the user is on the login page
    When the user submits with email "bad" and password "password123"
    Then an email validation error is shown

  Scenario: Login form - short password shows error
    Given the user is on the login page
    When the user submits with email "test@example.com" and password "short"
    Then a password validation error is shown

  Scenario: Edit project - empty title shows error
    Given the edit project modal is open
    When the user clears the title and saves
    Then a title validation error is shown

  Scenario: Edit project - empty start date shows error
    Given the edit project modal is open
    When the user clears the start date and saves
    Then a date validation error is shown

  Scenario: Edit project - due soon threshold validates range 1-30
    Given the edit project modal is open
    When the user enters threshold "0"
    Then a threshold validation error is shown

  Scenario: Invite member - invalid email or UUID shows error
    Given the invite member modal is open
    When the user enters "not-valid" as the email
    And submits the invite
    Then an invite validation error is shown

  Scenario: Settings - invalid avatar URL shows error on blur
    Given the user is on the Settings page
    When the user enters "not-a-url" in the avatar field
    And clicks outside the field
    Then an avatar validation error is shown

  Scenario: Create project - disabled submit when title empty
    Given the create project modal is open at step 2
    Then the create button is disabled
