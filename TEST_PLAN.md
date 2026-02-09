# Test Plan: Project Creation Hardening

## 1. Context & Objectives
**Goal**: Ensure the "Create Project" flow is robust, atomic, and statistically correct for RLS.
**Critical Flaw Identified**: The current `has_project_role` function strictly checks `project_members`. However, the Project Creator is not automatically added to `project_members` upon project creation. This creates an RLS Deadlock where the creator cannot administer their own project.

## 2. The Fix Strategy
We will move the "Add Creator as Member" logic into the `initialize_default_project` RPC. Since this RPC runs as `SECURITY DEFINER`, it can bypass the `project_members` RLS restriction and bootstrap the ownership.

## 3. Test Cases

### 3.1. Integration Test (`src/tests/integration/create-project.spec.jsx`)
**Status:** ✅ VERIFIED
This test uses `vitest` with mocked Supabase/PlanterClient to verify the service logic and error handling.

*   **Case 1: Success Path**
    *   **Input**: Valid project data (`title`, `start_date`, `creator_id`).
    *   **Expectation**:
        *   `planter.entities.Project.create` is called.
        *   `planter.rpc('initialize_default_project')` is called with correct args.
        *   Function returns the project object.
*   **Case 2: RPC Failure (Rollback)**
    *   **Input**: Valid data, but RPC returns `{ error: 'RPC Failed' }`.
    *   **Expectation**:
        *   `planter.entities.Project.delete` is called (Rollback).
        *   Function throws descriptive error.
*   **Case 3: Missing Creator**
    *   **Input**: No `creator` in args, `planter.auth.me()` returns null.
    *   **Expectation**: Throws "User must be logged in".

### 3.2. Unit Test (`NewProjectForm.test.jsx`)
*   **Case 1: Validation**
    *   **Input**: Empty form submission.
    *   **Expectation**: Zod errors for `title` (Required) and `start_date` (Required).
*   **Case 2: Loading State**
    *   **Input**: Valid submit.
    *   **Expectation**: Submit button disabled, Spinner visible.

### 3.3. Unit Test (`src/tests/unit/dateInheritance.test.js`)
**Status:** ✅ VERIFIED
*   **Case 1: Basic Propagation**
    *   **Input**: Parent moves +5 days.
    *   **Expectation**: Child moves +5 days.
*   **Case 2: Null Dates**
    *   **Input**: Parent has no date -> sets date.
    *   **Expectation**: Child keeps its relative offset if it had one, or sets to parent date?
    *   **Decision**: If Child has NO date, it remains no date (unless we enforce inheritance). If Child HAS date, it shifts.
*   **Case 3: Subtree Propagation**
    *   **Input**: Grandparent moves.
    *   **Expectation**: Parent and Child move.

### 3.4. Integration Test (`src/tests/integration/drag-interaction.spec.jsx`)
**Status:** ✅ VERIFIED
*   **Case 1: Date Cascade on Reparenting**
    *   **Setup**: 
        *   Task A (Jan 1) is under Milestone X (Jan 1). 
        *   Milestone Y starts Feb 1.
    *   **Action**: Drag Task A into Milestone Y.
    *   **Expectation**: 
        *   Task A `parent_task_id` becomes Milestone Y.
        *   Task A `start_date` becomes Feb 1 (maintains +0 offset from new parent start).
        *   DB update includes both parent change and date change.

## 4. Manual Verification Steps
1.  **SQL Patch**: Apply `docs/db/20260209_fix_project_creation.sql` (New migration).
2.  **UI Verification**:
    *   Go to Dashboard.
    *   Click "New Project".
    *   Enter "Alpha Protocol Project".
    *   Click Create.
    *   **Pass Criteria**:
        *   Project appears in Dashboard instantly (Optimistic/Invalidated).
        *   Clicking Project works (RLS allows view).
        *   "Settings" -> "Team" shows You as Owner.

## 5. Artifacts Created/Modified
*   `[NEW]` `docs/db/20260209_fix_project_creation.sql`
*   `[MODIFY]` `src/features/dashboard/components/CreateProjectModal.jsx`
*   `[NEW]` `src/tests/integration/create-project.spec.jsx`
*   `[NEW]` `src/tests/unit/dateInheritance.test.js`
*   `[NEW]` `src/features/tasks/services/dateInheritance.js`
*   `[NEW]` `src/tests/integration/drag-interaction.spec.jsx`
