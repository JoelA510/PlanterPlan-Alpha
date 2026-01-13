---
description: Start working on a GitHub Issue (Branch, Plan, Assign)
---

1.  **Analyze the Issue**
    - Call `issue_read(issue_number=...)` to get the full context, requirements, and constraints.
    - Call `get_me()` to identify the current user's login.

2.  **Create Feature Branch**
    - Generate a branch name: `feat/<issue-number>-<short-description>` (e.g., `feat/12-add-login`).
    - Call `create_branch(branch=..., from_branch="main")`.
    - _Note: If the branch exists, ask the user if they want to reuse it or create a new one._

3.  **Draft Implementation Plan**
    - Create or Overwrite `implementation_plan.md` with the standard template.
    - **Goal**: Summarize the Issue Body.
    - **Proposed Changes**: List likely file modifications based on your knowledge of the codebase.
    - **Verification**: Define how you will prove it works (e.g., "Add test case to `auth.test.jsx`").

4.  **Admin Housekeeping**
    - **Assign**: Call `issue_write(method="update", issue_number=..., assignees=["<current-user-login>"])`.
    - **Status**: If a Project Board is active, ensure the item is in "In Progress" (using `update_project_item` if applicable, or `issue_write` if using Status field).

5.  **Handover**
    - Notify the user: "Branch `feat/...` created. Plan drafted. Please review `implementation_plan.md`."
