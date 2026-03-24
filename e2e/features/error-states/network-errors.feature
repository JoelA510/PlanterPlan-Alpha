Feature: Network Error Handling
  As a user I see appropriate feedback when network errors occur

  Background:
    Given the user is logged in

  Scenario: Error fallback is displayed on page load failure
    When the API returns an error during page load
    Then an error fallback component is displayed
    And a retry button is visible

  Scenario: Toast notification on action failure
    Given the user is on the dashboard
    When a network error occurs during an action
    Then an error toast notification is displayed

  Scenario: Retry button recovers from error
    When the API returns an error during page load
    And the user clicks the retry button
    Then the page attempts to reload the data

  Scenario: Offline indicator when connection is lost
    When the user loses network connectivity
    Then an offline indicator or message is shown
