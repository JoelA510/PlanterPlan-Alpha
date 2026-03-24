Feature: Landing Page
  As a visitor I can see the marketing landing page

  Scenario: Hero section is visible
    Given the user is not authenticated
    When the user navigates to the home page
    Then the hero section with heading and call-to-action is visible

  Scenario: Feature cards are displayed
    Given the user is not authenticated
    When the user navigates to the home page
    Then feature description cards are visible

  Scenario: Sign up CTA redirects to login
    Given the user is not authenticated
    When the user navigates to the home page
    And the user clicks the sign up call-to-action
    Then the user is redirected to the login page

  Scenario: Navigation links are visible
    Given the user is not authenticated
    When the user navigates to the home page
    Then navigation links are visible in the header

  Scenario: Responsive layout on mobile
    Given the user is not authenticated
    When the user navigates to the home page on a mobile device
    Then the page displays correctly in a stacked layout

  Scenario: Landing page visual verification
    Given the user is not authenticated
    When the user navigates to the home page
    Then the landing page looks correct visually
