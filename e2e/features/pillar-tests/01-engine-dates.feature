Feature: Pillar 1 - Engine Test (Template Generation & Date Cascading)

  Background:
    Given the user is logged in

  Scenario: Create project with 30-day window and verify task dates
    When the user creates a new project "Date Engine Test"
    And sets start date to today and completion date to 30 days from now
    And selects the standard template
    Then the project generates with a populated task tree
    And all task due dates fall within the 30-day window
    And milestone dates encapsulate their child task dates

  Scenario: Change completion date and verify date recalculation
    Given a project "Date Engine Test" exists with a 30-day window
    When the user opens project settings
    And changes the completion date to 60 days from today
    And saves the changes
    Then all task due dates recalculate to span the 60-day window
    And milestone dates expand accordingly
