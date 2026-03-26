Feature: Keyboard Navigation
  As a user I can navigate the application using only a keyboard

  Background:
    Given the user is logged in
    And the user is on the dashboard

  Scenario: Tab key navigates through interactive elements
    When the user presses Tab repeatedly
    Then focus moves through interactive elements in a logical order

  Scenario: Enter key activates buttons
    When the user focuses a button using Tab
    And the user presses Enter
    Then the button action is triggered

  Scenario: Escape closes modal dialogs
    When a modal dialog is open
    And the user presses Escape
    Then the modal is closed

  Scenario: Arrow keys navigate within menus
    When a dropdown menu is open
    And the user presses arrow keys
    Then focus moves between menu items

  Scenario: Sidebar navigation via keyboard
    When the user tabs to a sidebar navigation item
    And the user presses Enter
    Then the user is navigated to that page

  Scenario: Command palette opens with keyboard shortcut
    When the user presses Cmd+K
    Then the command palette is visible
    And the search input is focused

  Scenario: Focus is trapped inside open modals
    When a modal dialog is open
    And the user presses Tab beyond the last element
    Then focus wraps back to the first element in the modal

  Scenario: Skip to main content link
    When the user presses Tab as the first action
    Then a skip to main content link is available
