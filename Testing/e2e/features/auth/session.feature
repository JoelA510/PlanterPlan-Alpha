Feature: Session Management

  Scenario: Unauthenticated user is redirected to login from dashboard
    Given the user is not authenticated
    When the user navigates to "/dashboard"
    Then the user is redirected to "/login"

  Scenario: Unauthenticated user is redirected to login from project page
    Given the user is not authenticated
    When the user navigates to "/project/some-id"
    Then the user is redirected to "/login"

  Scenario: Unauthenticated user is redirected to login from tasks page
    Given the user is not authenticated
    When the user navigates to "/tasks"
    Then the user is redirected to "/login"

  Scenario: Unauthenticated user is redirected to login from settings page
    Given the user is not authenticated
    When the user navigates to "/settings"
    Then the user is redirected to "/login"

  Scenario: Authenticated user can access all protected routes
    Given the user is logged in
    When the user navigates to "/dashboard"
    Then the page does not redirect to "/login"
    When the user navigates to "/tasks"
    Then the page does not redirect to "/login"
    When the user navigates to "/settings"
    Then the page does not redirect to "/login"

  Scenario: User can log out via header dropdown
    Given the user is logged in
    And the user is on the dashboard
    When the user opens the user menu
    And the user clicks "Log out"
    Then the user is redirected to "/login"

  Scenario: After logout user cannot access protected routes
    Given the user is not authenticated
    When the user navigates to "/dashboard"
    Then the user is redirected to "/login"
