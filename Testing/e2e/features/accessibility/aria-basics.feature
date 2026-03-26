Feature: ARIA and Semantic HTML
  As a screen reader user I get proper announcements and structure

  Background:
    Given the user is logged in

  Scenario: Pages have proper heading hierarchy
    When the user is on the dashboard
    Then there is exactly one h1 heading
    And headings follow a logical hierarchy

  Scenario: Form inputs have associated labels
    When the user is on the settings page
    Then every input field has an associated label
    And labels are programmatically linked to inputs

  Scenario: Buttons have accessible names
    When the user is on a project page
    Then every button has an accessible name via text content or aria-label

  Scenario: Dialogs have proper ARIA roles
    When a modal dialog is open
    Then the dialog has role="dialog"
    And the dialog has an accessible title

  Scenario: Toast notifications are announced
    When a success action triggers a toast
    Then the toast container has an appropriate ARIA role for announcements

  Scenario: Loading states are announced
    When a page is loading data
    Then a loading indicator with appropriate ARIA attributes is present
