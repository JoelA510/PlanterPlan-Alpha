# Pillar 3: The Security & Access Test (Role-Based Access Control)

**Objective:** Validate security protections and limited edit capabilities based on user roles.

## Instructions for Browser Subagent

1.  **Validates Owner Context capabilities:**
    - Log in as the primary Project Owner.
    - Navigate to the Team or People management section of a project.
    - Invite a new email as a "Limited User" (User B), assigning them to one specific task.
    - Invite another email as a "Coach" (User C), without specific task assignments.
    - Log out.

2.  **Validates Full User Context capabilities:**
    - (If applicable) Log in as a Full User (or grant Full User to yourself).
    - Navigate to the project.
    - Confirm you can edit the titles and statuses of any task on the board.
    - Log out.

3.  **Validates Limited User Context restrictions:**
    - Log in as User B (the Limited User).
    - Navigate to the project.
    - Verify you can visually see the entire board and structure.
    - Verify that edit buttons and inputs are disabled, hidden, or non-functional on tasks NOT explicitly assigned to you.
    - Click on the single task explicitly assigned to you.
    - Verify that you CAN edit the status and completion of that specific task.
    - Log out.

4.  **Validates Coach Context restrictions:**
    - Log in as User C (the Coach).
    - Navigate to the project.
    - Verify you can visually see the entire board and structure.
    - Attempt to edit a standard core task. Verify you are restricted.
    - Locate or create a task with the "Coaching" flag or type.
    - Verify that you CAN edit tasks flagged explicitly as "Coaching".
