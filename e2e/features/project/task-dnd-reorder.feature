Feature: Task Drag and Drop

  Background:
    Given the user is logged in
    And the user is on a project page with tasks

  Scenario: Drag task to reorder within same milestone
    When the user drags a task above another task in the same milestone
    Then the task order is updated

  Scenario: Drag task to reparent under different milestone
    When the user drags a task to a different milestone
    Then the task appears under the new milestone

  Scenario: Drop indicator shows above or below target task
    When the user starts dragging a task
    Then a drop indicator line is visible

  Scenario: Drag to empty milestone container appends task
    Given a milestone has no tasks
    When the user drags a task to the empty milestone
    Then the task appears in the previously empty milestone

  Scenario: Circular reparenting is prevented
    When the user attempts to drag a parent task into its own child
    Then the drop is rejected and the task returns to its original position
