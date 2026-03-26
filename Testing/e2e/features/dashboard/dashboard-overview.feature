Feature: Dashboard Overview

  Background:
    Given the user is logged in
    And the user is on the dashboard

  Scenario: Dashboard displays page title
    Then the page title is visible

  Scenario: Stats overview shows four stat cards
    Given the user has existing projects
    Then four stats cards are visible

  Scenario: Stats cards display project and task counts
    Given the user has existing projects
    Then the stats cards show project count, active tasks, completed tasks, and team activity

  Scenario: Empty state shows "No projects yet" message
    Given the user has no projects
    Then the empty state message is visible

  Scenario: Empty state shows "Create Your First Project" button
    Given the user has no projects
    Then the create first project button is visible

  Scenario: Dashboard loading state shows spinner
    When the page is loading
    Then a loading spinner is visible
