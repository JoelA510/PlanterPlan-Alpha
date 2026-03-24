Feature: Header

  Background:
    Given the user is logged in
    And the user is on the dashboard

  Scenario: Header shows PlanterPlan logo and name
    Then the PlanterPlan logo is visible in the header

  Scenario: Breadcrumb shows current section name
    Then the breadcrumb displays "Dashboard"
    When the user navigates to "/settings"
    Then the breadcrumb displays "Settings"

  Scenario: User avatar dropdown shows name and email
    When the user opens the user menu
    Then the user's name is displayed
    And the user's email is displayed

  Scenario: Dropdown has Settings and Log out items
    When the user opens the user menu
    Then a "Settings" menu item is visible
    And a "Log out" menu item is visible

  Scenario: Settings link navigates to settings page
    When the user opens the user menu
    And the user clicks "Settings"
    Then the user is redirected to "/settings"

  Scenario: Log out signs user out and redirects
    When the user opens the user menu
    And the user clicks "Log out"
    Then the user is redirected to "/login"

  Scenario: Mobile menu button toggles sidebar
    Given the viewport is mobile size
    When the user clicks the mobile menu button
    Then the sidebar becomes visible
