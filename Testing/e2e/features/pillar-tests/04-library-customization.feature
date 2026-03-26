Feature: Pillar 4 - Library Customization

  Background:
    Given the user is logged in as project owner

  Scenario: Open library and inject template task into project
    Given an active project exists
    When the user opens the Add Task form
    And searches the master library
    And selects a library template
    Then the task is cloned into the project

  Scenario: Duplicate library items are handled
    Given a project already contains a template task
    When the user searches the library for the same task
    Then appropriate deduplication behavior is shown
