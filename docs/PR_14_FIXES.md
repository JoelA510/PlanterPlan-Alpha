# PR #14 Fixes Summary

This document outlines the technical changes implemented to bring the `refactor` branch up to the requirements of PR #14.

## 1. Deep Copy Integration (P1)
**Goal**: Enable full recursive copying of task trees when creating projects or subtasks from templates.

-   **Service Layer (`src/services/taskService.js`)**:
    -   Implemented `deepCloneTask(templateId, newParentId, newOrigin, userId)`.
    -   Uses `fetchTaskChildren` to retrieve the entire template tree.
    -   Uses `prepareDeepClone` (new utility) to generate new UUIDs and remap `parent_task_id` references in memory before performing a batch insert.
-   **Utilities (`src/utils/treeHelpers.js`)**:
    -   Created `generateIdMap` and `prepareDeepClone` to handle the ID remapping logic, ensuring the tree structure is preserved.
-   **UI (`TaskList.jsx`, `NewTaskForm.jsx`)**:
    -   Updated `handleCreateProject` to detect `templateId` and trigger `deepCloneTask`.
    -   Updated `NewTaskForm` to capture `templateId` for subtask cloning.

## 2. Membership & Joined Projects (P2)
**Goal**: Allow users to see and access projects they have been invited to.

-   **Service Layer (`src/services/projectService.js`)**:
    -   Created `getJoinedProjects(userId)` to query `project_members` and fetch associated project tasks.
-   **Database Policies (`docs/db/policies.sql`)**:
    -   Added `select_joined_projects` RLS policy to allow `SELECT` on tasks where the user is in `project_members`.
-   **UI (`TaskList.jsx`)**:
    -   Added a "Joined Projects" section to the dashboard.
    -   Created `RoleIndicator` component to display roles (Owner, Editor, Viewer).

## 3. Master Library Search Fixes
**Goal**: Ensure search is reliable and handles errors gracefully.

-   **Error Handling**:
    -   Updated `useMasterLibrarySearch` hook to catch and expose errors.
    -   Updated `MasterLibrarySearch` component to display user-friendly error messages.
-   **Testing**:
    -   Added unit tests in `taskService.test.js` to verify search behavior and error handling.

## 4. Local Development
**Goal**: Reduce friction for developers.

-   **Documentation**: Created `docs/local_development.md` covering setup, linting, and testing.
-   **Testing Guide**: Documented manual steps for testing membership features locally (via DB inserts).
