Feature: Pillar 3 - RBAC Roles

  Scenario: Owner can invite members with roles
    Given the user is logged in as project owner
    When the user navigates to the project
    And invites a user as "Limited" role
    And invites another user as "Coach" role
    Then both invitations succeed

  Scenario: Editor can edit any task
    Given the user is logged in as editor
    When the user navigates to the project
    Then edit controls are visible on tasks
    And the user can change task status

  Scenario: Viewer cannot edit tasks
    Given the user is logged in as viewer
    When the user navigates to the project
    Then edit controls are hidden
    And the board is visible in read-only mode

  Scenario: Limited user can only edit assigned tasks
    Given the user is logged in as limited user
    When the user navigates to the project
    Then edit controls are hidden on non-assigned tasks
    And edit controls are visible on the assigned task
    And the user can change status of the assigned task
