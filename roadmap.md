# PlanterPlan Roadmap

Project roadmap for PlanterPlan, optimized for high parallelism via **component isolation**, **layer separation**, and **interface-first design**.

**Granularity Goal:** Each item should be reviewable/verifiable within **1 hour**.

---

## Phase 0: Foundation & Standards (High Priority)
*Goal: Establish standards to prevent "ugly" merges later. No functionality changes.*

### 0.1 Lint & Format Baseline
**ID:** `P0-LINT-BASE`
**Status:** Done
- **Description**: Lock in eslint/prettier config and apply a one-time formatting pass.
- **Depends on**: None
- **Touches**: `package.json`, `.eslintrc.json`, `src/**/*.js`
- **DoD**: 
  - `npm run lint` passes without warnings.
  - Codebase formatted via Prettier.

### 0.2 Shared Data Shapes
**ID:** `P0-DATA-SHAPES`
**Status:** Done
- **Description**: Create central PropTypes definitions (Task, Project, User).
- **Depends on**: `P0-LINT-BASE`
- **Touches**: `src/utils/shapes.js` (New File)
- **DoD**:
  - `TaskShape`, `ProjectShape`, `UserShape` exported.
  - Used in `TaskItem.jsx` to verify.

---

## Phase 1: Master Library & Deep Copy (High Parallelism)
*Goal: Complete the "View" vs "Copy" flows. The "Deep Clone" logic is critical here.*

### 1.1 Search Component Logic
**ID:** `P1-SEARCH-LOGIC`
**Status:** Done
- **Description**: Add `mode` prop to Search to handle 'view' vs 'copy' actions.
- **Depends on**: `P0-DATA-SHAPES`
- **Touches**: `src/components/tasks/MasterLibrarySearch.jsx`
- **DoD**: 
  - Renders "View" vs "Copy" button based on `mode` prop.

### 1.2 Template Data Lookup
**ID:** `P1-HELPER-LOOKUP`
- **Description**: Utility to fetch full task details from context/service.
- **Depends on**: None
- **Touches**: `src/services/taskService.js`
- **DoD**: 
  - `fetchTaskById(id)` implemented and verified.

### 1.3 Template Deep Copy Engine
*Broken down for reviewability.*

#### 1.3a Tree Fetcher
**ID:** `P1-TEMPLATE-FETCH`
- **Description**: Service method to fetch a Task + all descendants (Subtasks, Milestones).
- **Depends on**: `P1-HELPER-LOOKUP`
- **Touches**: `src/services/taskService.js`
- **DoD**:
  - Returns nested object tree.

#### 1.3b Tree Cloner (Pure Logic)
**ID:** `P1-TEMPLATE-CLONE`
- **Description**: Pure utility function to deep clone the tree and generate new UUIDs.
- **Depends on**: None
- **Touches**: `src/utils/treeHelpers.js` (New)
- **DoD**:
  - Returns new tree with new IDs.
  - Unit test: Input tree -> Output tree with different IDs but same structure.

#### 1.3c Tree Persistence
**ID:** `P1-TEMPLATE-SAVE`
- **Description**: Service method to save the cloned tree to the DB.
- **Depends on**: `P1-TEMPLATE-CLONE`
- **Touches**: `src/services/taskService.js`
- **DoD**:
  - Saves all nodes in the tree to Supabase.

### 1.4 Copy Mode Integration (UI Layer)
*Broken down for reviewability.*

#### 1.4a UI Event Handling
**ID:** `P1-UI-EVENTS`
- **Description**: Wire up the "Copy" button click in `NewTaskForm` to trigger the fetch/clone process (mocked).
- **Depends on**: `P1-SEARCH-LOGIC`
- **Touches**: `src/components/tasks/NewTaskForm.jsx`
- **DoD**:
  - Clicking "Copy" logs the correct template ID and target parent ID.

#### 1.4b Service Integration
**ID:** `P1-UI-INTEGRATION`
- **Description**: Connect the real `deepCloneTaskTree` service to the UI.
- **Depends on**: `P1-UI-EVENTS`, `P1-TEMPLATE-SAVE`
- **Touches**: `src/components/tasks/NewTaskForm.jsx`
- **DoD**:
  - Successful copy shows success notification.
  - Error handling displays error message.

---

## Phase 2: Team Management & Joined Projects (Max Parallelism)
*Goal: Securely allow users to view projects they are invited to.*

### 2.1 Database RLS Policies
**ID:** `P2-DB-RLS-POLICIES`
- **Description**: Implement `select_joined_projects` policy.
- **Depends on**: None
- **Touches**: `docs/db/policies.sql`
- **DoD**: 
  - SQL file contains correct policy definition.

### 2.2 Membership Service
**ID:** `P2-SVC-MEMBERSHIPS`
- **Description**: Fetch logic for joined projects.
- **Depends on**: `P2-DB-RLS-POLICIES`
- **Touches**: `src/services/projectService.js`
- **DoD**: 
  - `getJoinedProjects(userId)` implemented.

### 2.3 Role Indicator UI
**ID:** `P2-UI-ROLE-INDICATOR`
- **Description**: Visual badge showing 'Owner' vs 'Editor'.
- **Depends on**: `P0-LINT-BASE`
- **Touches**: `src/components/common/RoleIndicator.jsx`, `src/styles/components/role-indicator.css`
- **DoD**: 
  - Renders correct badge based on prop.

### 2.4 Dashboard "Joined" Section
*Broken down for reviewability.*

#### 2.4a List Component Update
**ID:** `P2-UI-LIST-UPDATE`
- **Description**: Update `TaskList` to accept a `projects` prop or similar to render a specific list.
- **Depends on**: None
- **Touches**: `src/components/tasks/TaskList.jsx`
- **DoD**:
  - Component can render a provided list of projects (decoupling from internal fetch if needed, or adding "type" prop).

#### 2.4b Dashboard Integration
**ID:** `P2-UI-DASHBOARD`
- **Description**: Add the "Joined Projects" section to the Dashboard page using the updated list component.
- **Depends on**: `P2-SVC-MEMBERSHIPS`, `P2-UI-LIST-UPDATE`
- **Touches**: `src/pages/Dashboard.jsx` (or equivalent), `src/styles/pages/dashboard.css`
- **DoD**:
  - Displays "Joined Projects" section.

---

## Phase 3: Code Hygiene (Isolated Refactors)
*Goal: Clean up debt.*

### 3.1 Directory Cleanup
**ID:** `P3-CLEAN-DIRS`
- **Description**: Remove unused CSS and consolidate imports.
- **Touches**: `src/styles/**`
- **DoD**: 
  - Unused files removed.

### 3.2 Test Coverage Spike
**ID:** `P3-TEST-UTILS`
- **Description**: Add unit tests for Date and Search utils.
- **Touches**: `src/utils/dateUtils.test.js`, `src/utils/highlightMatches.test.js`
- **DoD**: 
  - Tests pass.

---

## Phase 4: The Date Engine & Drag-n-Drop (Sequential Core)
*Goal: Stable, conflict-free drag and drop with rollbacks.*

### 4.1 Data Fixtures
**ID:** `P4-DATA-FIXTURES`
- **Description**: Create complex project JSON snapshot for testing.
- **Depends on**: None
- **Touches**: `src/tests/fixtures/complexProject.json`
- **DoD**: 
  - JSON file exists and is valid.

### 4.2 Logic Extraction (Refactor)
*Broken down for reviewability.*

#### 4.2a Drag Hook Creation
**ID:** `P4-DRAG-HOOK`
- **Description**: Create `useTaskDragDrop` hook and move logic there (copy-paste refactor first).
- **Depends on**: `P4-DATA-FIXTURES`
- **Touches**: `src/hooks/useTaskDragDrop.js`
- **DoD**:
  - Hook exists and contains the logic.

#### 4.2b Context Cleanup
**ID:** `P4-CONTEXT-CLEAN`
- **Description**: Replace logic in `TaskContext` with the new hook.
- **Depends on**: `P4-DRAG-HOOK`
- **Touches**: `src/contexts/TaskContext.jsx`
- **DoD**:
  - Drag and drop still works (regression test).

### 4.3 Sparse Positioning & Rollback
*Broken down for reviewability.*

#### 4.3a Sparse Math Logic
**ID:** `P4-SPARSE-CALC`
- **Description**: Pure function to calculate mid-point positions.
- **Depends on**: None
- **Touches**: `src/utils/positionUtils.js` (New)
- **DoD**:
  - Unit tests: `calcMidPoint(100, 200) -> 150`.

#### 4.3b Optimistic UI Updates
**ID:** `P4-OPTIMISTIC-UI`
- **Description**: Update hook to apply local state change immediately.
- **Depends on**: `P4-SPARSE-CALC`, `P4-CONTEXT-CLEAN`
- **Touches**: `src/hooks/useTaskDragDrop.js`
- **DoD**:
  - UI updates instantly on drop.

#### 4.3c Rollback Mechanism
**ID:** `P4-ROLLBACK`
- **Description**: Handle API failure by reverting local state.
- **Depends on**: `P4-OPTIMISTIC-UI`
- **Touches**: `src/hooks/useTaskDragDrop.js`
- **DoD**:
  - Mocked failure causes item to snap back.

### 4.4 Date Recalculation Fix
*Broken down for reviewability.*

#### 4.4a Date Logic Isolation
**ID:** `P4-DATE-LOGIC`
- **Description**: Pure function to recalculate dependent dates.
- **Depends on**: None
- **Touches**: `src/utils/dateRecalc.js` (New)
- **DoD**:
  - Unit tests for dependency chains.

#### 4.4b Hook Integration
**ID:** `P4-DATE-TRIGGER`
- **Description**: Trigger recalculation only after move confirmation.
- **Depends on**: `P4-DATE-LOGIC`, `P4-OPTIMISTIC-UI`
- **Touches**: `src/hooks/useTaskDates.js`
- **DoD**:
  - Moving parent updates children dates.

---

## Phase 5: Reports & Resources (Feature Expansion)

### 5.1 Resource Filters
**ID:** `P5-RESOURCE-FILTERS`
- **Description**: Filter library by PDF vs URL vs Text.
- **Touches**: `src/components/resources/ResourceList.jsx`
- **DoD**: 
  - Filter buttons work.

### 5.2 Monthly Report View
**ID:** `P5-REPORT-UI`
- **Description**: Read-only view for project status.
- **Touches**: `src/components/reports/MonthlyReport.jsx`
- **DoD**: 
  - Renders filtered tasks.
