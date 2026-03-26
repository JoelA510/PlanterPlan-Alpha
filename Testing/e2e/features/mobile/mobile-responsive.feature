Feature: Mobile Responsive

  Background:
    Given the user is logged in
    And the viewport is mobile size

  Scenario: Sidebar is hidden by default on mobile
    Then the sidebar is not visible

  Scenario: Hamburger menu button visible on mobile
    Then the mobile menu button is visible

  Scenario: Tapping hamburger opens sidebar overlay
    When the user taps the mobile menu button
    Then the sidebar overlay is visible
    And the sidebar is visible

  Scenario: Tapping overlay closes sidebar
    Given the sidebar is open on mobile
    When the user taps the overlay
    Then the sidebar is hidden

  Scenario: FAB button visible on mobile
    Then the floating action button is visible

  Scenario: FAB dropdown shows "New Project" option
    When the user taps the floating action button
    Then the "New Project" option is visible

  Scenario: Task details panel uses full width on mobile
    Given the user is on a project page with tasks
    When the user taps on a task
    Then the task details panel uses full viewport width
