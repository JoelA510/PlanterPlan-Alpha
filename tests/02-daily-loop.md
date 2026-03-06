# Pillar 2: The Daily Loop (Task Completion & The Priority View)

**Objective:** Validate day-to-day user experience and Priority display rules.

## Instructions for Browser Subagent

1.  **User logs in and navigates to an active project:**
    - Navigate to the login page and authenticate.
    - Select a pre-existing project that has an active task tree.

2.  **User toggles the board to Priority View:**
    - Locate the view toggles on the project board.
    - Switch the view from "Standard" or "Tree" to "Priority View".

3.  **Verify: Only "Current", "Due Soon", and "Overdue" tasks are visible:**
    - Visually scan the displayed tasks.
    - Confirm that tasks with future dates (e.g., beyond the standard "Due Soon" window) do not appear on the screen.

4.  **Verify (Fix): Empty Milestones are completely hidden:**
    - Confirm that Milestones that no longer have any outstanding tasks attached to them in the priority window do not display empty headers.

5.  **Verify (Fix): Orphaned Tasks correctly display underneath their parent Milestone header:**
    - Confirm that active tasks are properly grouped under their immediate parent Milestone/Phase name for context.

6.  **User clicks "Complete" on a Task that has outstanding child dependents:**
    - Locate a task that serves as a parent to other sub-tasks (if none present, create one quickly).
    - Mark the parent task as complete using the UI checkbox or status toggle.

7.  **Verify: The system prompts the user with a confirmation warning:**
    - Confirm a modal or dialogue appears warning the user that completing the parent will complete all child tasks.

8.  **User confirms the prompt:**
    - Click "Confirm" or "Yes" on the warning modal.

9.  **Verify: The parent task is marked complete, and all child tasks are auto-marked complete:**
    - Check the task list to ensure the parent is now checked/completed.
    - Uncover or view the child tasks and confirm they also automatically inherited the "Complete" status.
