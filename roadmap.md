# PlanterPlan Roadmap

Project roadmap for PlanterPlan, optimized for high parallelism via **component isolation**, **layer separation**, and **interface-first design**.

---

## Conventions

Each task includes:

- **ID** – Stable identifier for planning and PR naming.
- **Depends on** – Task IDs that must land first.
- **Parallel with** – Safe tasks that can be in flight at the same time.
- **Touches** – Primary files/directories affected.
- **Branch** – Suggested branch name.
- **DoD** – Definition of Done (high level).

Branch naming pattern: `p<phase>-<short-area>/<short-task>`

---

## Phase 0: Cross-Cutting Scaffolding

Goal: Establish standards that reduce merge conflicts and make later phases safer.

### 0.1 Lint & Format Baseline

**ID:** P0-LINT-BASE

- **Description**: Lock in eslint/prettier config and apply a one-time formatting pass.
- **Depends on**: None
- **Parallel with**: All later phases (should be done first in practice, but does not logically depend on others)
- **Touches**: `package.json`, `.eslintrc.*`, `.prettierrc*`, `src/**`
- **Branch**: `p0-lint/base-format`
- **DoD**:
  - ESLint + Prettier config committed.
  - One large "format only" commit applied (no logic changes).
  - CI / local scripts updated: `npm run lint`, `npm run format`.

### 0.2 Shared Types & Domain Contracts

**ID:** P0-TYPES-DOMAIN

- **Description**: Introduce shared domain shapes used across later phases.
- **Depends on**: P0-LINT-BASE
- **Parallel with**: Most of Phase 1 & 2 (UI wiring, simple helpers)
- **Touches**: `src/types/domain.ts` (or `src/utils/domainTypes.js`), any consumers updated gradually.
- **Branch**: `p0-types/domain-contracts`
- **DoD**:
  - Types defined: `LibraryTask`, `ProjectRole`, `JoinedProject`, `ReportSpec`.
  - No behavioral changes; only type imports and JSDoc/TS definitions.

---

## Phase 1: Master Library Search & UX (High Parallelism)

Goal: Complete distinct "View" and "Copy" flows for master library tasks.

### 1.1 Search Component Contracts

**ID:** P1-SEARCH-CONTRACT

- **Description**: Define the public API for `MasterLibrarySearch` using shared types.
- **Depends on**: P0-TYPES-DOMAIN
- **Parallel with**: P1-SEARCH-TESTS, P1-HELPER-LOOKUP
- **Touches**: `src/components/MasterLibrary/MasterLibrarySearch.jsx`, `src/types/domain.ts`
- **Branch**: `p1-search/contracts`
- **DoD**:
  - `MasterLibrarySearch` props defined:
    - `mode: 'view' | 'copy'`
    - `onViewTask?(task: LibraryTask)`
    - `onCopyTask?(task: LibraryTask)`
  - Component signature updated with defaults.
  - No functional behavior changes yet.

### 1.2 Search Component Test Harness

**ID:** P1-SEARCH-TESTS

- **Description**: Add stories/tests for `MasterLibrarySearch` to protect the refactor.
- **Depends on**: P1-SEARCH-CONTRACT (for final props), P0-LINT-BASE
- **Parallel with**: P1-HELPER-LOOKUP
- **Touches**: `src/components/MasterLibrary/__tests__/MasterLibrarySearch.test.jsx` (or `.stories.jsx`)
- **Branch**: `p1-search/tests`
- **DoD**:
  - Tests cover:
    - Rendering with `mode="view"` vs `mode="copy"`.
    - Firing `onViewTask` / `onCopyTask` callbacks.
  - Tests run green and integrated into `npm test`.

### 1.3 Search Component – Mode Prop & Conditional Buttons

**ID:** P1-SEARCH-MODE-UI

- **Description**: Implement `mode` behavior and render appropriate buttons.
- **Depends on**: P1-SEARCH-CONTRACT
- **Parallel with**: P1-HELPER-LOOKUP, P1-SEARCH-TESTS (tests can be written in parallel)
- **Touches**: `src/components/MasterLibrary/MasterLibrarySearch.jsx`
- **Branch**: `p1-search/mode-ui`
- **DoD**:
  - `mode === 'view'` shows "View Task" button.
  - `mode === 'copy'` shows "Copy to New Task" button.
  - No callbacks wired yet (UI only).

### 1.4 Helper – Template Lookup

**ID:** P1-HELPER-LOOKUP

- **Description**: Provide helpers for looking up and cloning template data from context.
- **Depends on**: P0-TYPES-DOMAIN
- **Parallel with**: P1-SEARCH-MODE-UI, P1-SEARCH-TESTS
- **Touches**: `src/utils/taskUtils.js` (or `src/contexts/TaskContext.jsx` if needed), `src/types/domain.ts`
- **Branch**: `p1-helper/template-lookup`
- **DoD**:
  - `getTemplateDataById(id: string): LibraryTask | null` implemented, using in-memory state (no extra API call).
  - `cloneTemplateToFormData(template: LibraryTask)` implemented to map template data into form-friendly shape.
  - Unit tests for both functions.

### 1.5 Search Component – Callback Wiring

**ID:** P1-SEARCH-CALLBACKS

- **Description**: Connect the buttons in `MasterLibrarySearch` to the new helper utilities via props.
- **Depends on**: P1-SEARCH-MODE-UI, P1-HELPER-LOOKUP
- **Parallel with**: P1-TEMPLATELIST-VIEW, P1-TEMPLATEFORM-COPY-EMBED
- **Touches**: `src/components/MasterLibrary/MasterLibrarySearch.jsx`
- **Branch**: `p1-search/callbacks`
- **DoD**:
  - `onViewTask` called with the full `LibraryTask` object.
  - `onCopyTask` called with the full `LibraryTask` object.
  - Existing tests extended or new tests added for callbacks.

### 1.6 Template List – View Mode Wiring

**ID:** P1-TEMPLATELIST-VIEW

- **Description**: Integrate `MasterLibrarySearch` into `TemplateList` in `view` mode.
- **Depends on**: P1-SEARCH-CONTRACT, P1-SEARCH-CALLBACKS (for fully wired behavior)
- **Parallel with**: P1-TEMPLATEFORM-COPY-EMBED
- **Touches**: `src/components/TemplateList/TemplateList.jsx`
- **Branch**: `p1-templateList/view-mode`
- **DoD**:
  - `MasterLibrarySearch` embedded in `TemplateList` with `mode="view"`.
  - Handler `handleViewTask(task)` implemented to call existing `selectTask` or equivalent selection logic.
  - Basic smoke test / interaction test added.

### 1.7 Template Task Form – Copy Mode Embed

**ID:** P1-TEMPLATEFORM-COPY-EMBED

- **Description**: Embed `MasterLibrarySearch` within the template task editing UI for copy.
- **Depends on**: P1-SEARCH-CONTRACT
- **Parallel with**: P1-TEMPLATEFORM-COPY-LOGIC (once embed structure is ready)
- **Touches**: `src/components/TaskForm/TemplateTaskForm.jsx` (or sidebar container), layout files
- **Branch**: `p1-templateForm/copy-embed`
- **DoD**:
  - `MasterLibrarySearch` placed in Template Task form or its sidebar with `mode="copy"`.
  - `handleCopyTask` function stubbed out (no logic yet).
  - Visual layout verified.

### 1.8 Template Task Form – Copy Logic

**ID:** P1-TEMPLATEFORM-COPY-LOGIC

- **Description**: Implement the `handleCopyTask` logic to populate form data from a library task.
- **Depends on**: P1-HELPER-LOOKUP, P1-TEMPLATEFORM-COPY-EMBED
- **Parallel with**: P1-TEMPLATELIST-VIEW (once shared helpers are available)
- **Touches**: `src/components/TaskForm/TemplateTaskForm.jsx`, `src/utils/taskUtils.js`
- **Branch**: `p1-templateForm/copy-logic`
- **DoD**:
  - `handleCopyTask(task: LibraryTask)` uses `cloneTemplateToFormData` and `setFormData`.
  - Respects existing validation/date behaviors in the form.
  - Tests verify form fields are populated correctly.

---

## Phase 2: Team Management & Joined Projects (Maximum Parallelism)

Goal: Allow users to see and understand projects they have been invited to.

### 2.1 Joined Projects Domain Model

**ID:** P2-DOMAIN-JOINED

- **Description**: Define `ProjectRole` and `JoinedProject` in the shared domain types.
- **Depends on**: P0-TYPES-DOMAIN
- **Parallel with**: P2-SVC-MEMBERSHIPS-RAW, P2-UI-ROLE-INDICATOR
- **Touches**: `src/types/domain.ts`
- **Branch**: `p2-domain/joined-projects`
- **DoD**:
  - `type ProjectRole = 'Owner' | 'Editor' | 'Viewer'`.
  - `interface JoinedProject { id; name; role: ProjectRole; lastActivity; ownerName; ... }`.

### 2.2 Service – Raw Membership Fetch

**ID:** P2-SVC-MEMBERSHIPS-RAW

- **Description**: Implement Supabase query for project memberships.
- **Depends on**: P2-DOMAIN-JOINED
- **Parallel with**: P2-UI-ROLE-INDICATOR
- **Touches**: `src/services/projectMembershipService.js`
- **Branch**: `p2-service/memberships-raw`
- **DoD**:
  - `getProjectMembershipsRaw(userId)` implemented with Supabase join on `project_members` and `tasks`.
  - Error handling and basic response validation.
  - Basic unit test with mocked Supabase client.

### 2.3 Service – Joined Projects API

**ID:** P2-SVC-JOINED-PROJECTS

- **Description**: Wrap raw fetch in a domain-focused function.
- **Depends on**: P2-SVC-MEMBERSHIPS-RAW
- **Parallel with**: P2-HOOK-JOINED-PROJECTS
- **Touches**: `src/services/projectMembershipService.js`, `src/types/domain.ts`
- **Branch**: `p2-service/joined-projects`
- **DoD**:
  - `getJoinedProjectsForUser(userId): Promise<JoinedProject[]>` implemented.
  - Maps DB rows to `JoinedProject` domain objects.
  - Error path returns empty array or throws a controlled error.

### 2.4 UI – Project Role Indicator Component

**ID:** P2-UI-ROLE-INDICATOR

- **Description**: Visual chip/badge showing a user’s role on a project.
- **Depends on**: P2-DOMAIN-JOINED
- **Parallel with**: P2-HOOK-JOINED-PROJECTS, P2-CONTEXT-JOINED-STATE
- **Touches**: `src/components/ProjectRoleIndicator.jsx`
- **Branch**: `p2-ui/role-indicator`
- **DoD**:
  - Component accepts `role: ProjectRole` prop.
  - Color-coded styles and tooltip text describing permissions.
  - Unit tests or Storybook story for each role.

### 2.5 Hook – Joined Projects

**ID:** P2-HOOK-JOINED-PROJECTS

- **Description**: Provide a reusable hook for loading joined projects.
- **Depends on**: P2-SVC-JOINED-PROJECTS
- **Parallel with**: P2-CONTEXT-JOINED-STATE, P2-UI-JOINED-SECTION
- **Touches**: `src/hooks/useJoinedProjects.js`
- **Branch**: `p2-hook/joined-projects`
- **DoD**:
  - `useJoinedProjects()` returns `{ joinedProjects, loading, error, reload }`.
  - Uses `getJoinedProjectsForUser` internally.
  - Tested with mocked service.

### 2.6 Context – Joined Projects State

**ID:** P2-CONTEXT-JOINED-STATE

- **Description**: Integrate joined projects into `TaskContext` (or appropriate global context).
- **Depends on**: P2-HOOK-JOINED-PROJECTS
- **Parallel with**: P2-UI-JOINED-SECTION
- **Touches**: `src/contexts/TaskContext.jsx`
- **Branch**: `p2-context/joined-projects`
- **DoD**:
  - Adds `joinedProjects` and `joinedProjectsLoading` to context state.
  - Exposes `loadJoinedProjects()` that uses `useJoinedProjects` internally or calls the service.
  - Does **not** alter existing `fetchTasks` behavior.

### 2.7 Task List – Joined Projects Section

**ID:** P2-UI-JOINED-SECTION

- **Description**: Render a dedicated “Joined Projects” section below “Your Projects”.
- **Depends on**: P2-CONTEXT-JOINED-STATE, P2-UI-ROLE-INDICATOR
- **Parallel with**: None (layout integration)
- **Touches**: `src/components/TaskList/TaskList.jsx`, `src/components/TaskList/JoinedProjectsSection.jsx`
- **Branch**: `p2-ui/joined-section`
- **DoD**:
  - New `JoinedProjectsSection` component created and used in `TaskList`.
  - Renders only if `joinedProjects.length > 0`.
  - Uses existing `TaskItem` for display where feasible, plus `ProjectRoleIndicator`.

---

## Phase 3: Technical Debt & Stability (File-Level Separation)

Goal: Stabilize codebase and reduce noise before Date Engine work.

### 3.1 PropTypes & Type Safety in Task Components

**ID:** P3-TASK-PROTYPES

- **Description**: Fix prop validation issues and minor type mismatches in task-related components.
- **Depends on**: P0-LINT-BASE
- **Parallel with**: P3-HOOK-ABORT-STANDARD, P3-UTIL-TEST-DATES, P3-UTIL-TEST-HIGHLIGHT
- **Touches**: `src/components/TaskList/TaskItem.jsx`, `TaskDetailsView.jsx`, `TaskList.jsx`
- **Branch**: `p3-tasks/proptypes`
- **DoD**:
  - All React warnings about missing PropTypes / invalid types resolved.
  - No behavior changes.

### 3.2 Unused Imports & Variables Cleanup

**ID:** P3-TASK-UNUSED-CLEANUP

- **Description**: Remove unused imports and variables in `src/components/tasks`.
- **Depends on**: P0-LINT-BASE
- **Parallel with**: P3-TASK-PROTYPES (but coordinate to reduce file overlap)
- **Touches**: `src/components/TaskList/**`
- **Branch**: `p3-tasks/cleanup-unused`
- **DoD**:
  - ESLint shows no unused variable/import warnings in `src/components/TaskList`.

### 3.3 Hook AbortController Standardization

**ID:** P3-HOOK-ABORT-STANDARD

- **Description**: Standardize cancellation patterns in master library hooks.
- **Depends on**: P0-LINT-BASE
- **Parallel with**: P3-TASK-PROTYPES, P3-UTIL-TEST-DATES, P3-UTIL-TEST-HIGHLIGHT
- **Touches**: `src/hooks/useMasterLibraryTasks.js`, `src/hooks/useMasterLibrarySearch.js`
- **Branch**: `p3-hooks/abort-standard`
- **DoD**:
  - Both hooks use a consistent `AbortController` pattern and cleanup in `useEffect`.
  - Tests verify that requests are cancelled on unmount.

### 3.4 Utility Date Tests Harness

**ID:** P3-UTIL-TEST-DATES

- **Description**: Create a shared test harness and add unit tests for `dateUtils`.
- **Depends on**: P0-LINT-BASE
- **Parallel with**: P3-HOOK-ABORT-STANDARD, P3-UTIL-TEST-HIGHLIGHT
- **Touches**: `src/utils/dateUtils.js`, `tests/utils/dateUtils.test.js`
- **Branch**: `p3-utils/date-tests`
- **DoD**:
  - Coverage for leap years, month rollovers, boundary conditions.
  - Test data located in shared `tests/utils/dateFixtures.js`.

### 3.5 Search Highlight Tests

**ID:** P3-UTIL-TEST-HIGHLIGHT

- **Description**: Add regression tests for search highlighting logic.
- **Depends on**: P0-LINT-BASE
- **Parallel with**: P3-UTIL-TEST-DATES, P3-HOOK-ABORT-STANDARD
- **Touches**: `src/utils/highlightMatches.js`, `tests/utils/highlightMatches.test.js`
- **Branch**: `p3-utils/highlight-tests`
- **DoD**:
  - Tests for special characters, mixed case, and empty queries.

### 3.6 Error Boundary & Logging Utilities

**ID:** P3-ERROR-BOUNDARY

- **Description**: Introduce an error boundary and simple logging utility around core task routes.
- **Depends on**: P0-LINT-BASE
- **Parallel with**: P3-TASK-PROTYPES, P3-HOOK-ABORT-STANDARD
- **Touches**: `src/components/common/ErrorBoundary.jsx`, `src/utils/logging.js`, App wrapper
- **Branch**: `p3-core/error-boundary`
- **DoD**:
  - Error boundary wraps main task/organization routes.
  - Logging helper used for non-fatal errors (especially for Phase 4).

---

## Phase 4: Date Engine & Drag-n-Drop Refactor (Bottleneck / Sequential)

Goal: Extract and stabilize the drag-and-drop and date logic in a safer, testable way.

### 4.1 Feature Flag / Shadow Mode for Date Engine

**ID:** P4-FLAG-DATE-ENGINE

- **Description**: Add a feature flag to run a new Date Engine in "shadow" mode.
- **Depends on**: P3-UTIL-TEST-DATES, P3-ERROR-BOUNDARY
- **Parallel with**: P4-UTIL-SPARSE-POSITION
- **Touches**: `src/contexts/TaskContext.jsx`, `src/utils/config.js`
- **Branch**: `p4-date/flag-shadow`
- **DoD**:
  - Config/flag controlling whether the new engine is used for UI or only for background comparison.
  - Logging of diffs between old and new calculations (non-blocking).

### 4.2 Sparse Positioning Utility

**ID:** P4-UTIL-SPARSE-POSITION

- **Description**: Implement a standalone sparse positioning function with tests.
- **Depends on**: P3-UTIL-TEST-DATES (for test harness reuse)
- **Parallel with**: P4-FLAG-DATE-ENGINE
- **Touches**: `src/utils/sparsePositioning.js`, `tests/utils/sparsePositioning.test.js`
- **Branch**: `p4-utils/sparse-position`
- **DoD**:
  - `calculateInsertPosition(prevPos, nextPos)` implemented and tested.
  - Handles edge cases (no prev, no next, renormalization thresholds).

### 4.3 Extract Drag Logic Utilities

**ID:** P4-UTIL-DRAG-LOGIC

- **Description**: Extract pure drag logic from `TaskContext` into utility functions.
- **Depends on**: P4-UTIL-SPARSE-POSITION
- **Parallel with**: None (heavy overlap with core logic)
- **Touches**: `src/utils/dragUtils.js`, `src/utils/positionUtils.js`, `tests/utils/dragUtils.test.js`
- **Branch**: `p4-utils/drag-logic`
- **DoD**:
  - `handleOptimisticDragDrop` internals expressed as pure functions.
  - Existing behavior preserved; TaskContext still calls them.

### 4.4 Hook – useTaskDragDrop

**ID:** P4-HOOK-DRAGDROP

- **Description**: Create `useTaskDragDrop` hook and move drag handling logic from context to the hook.
- **Depends on**: P4-UTIL-DRAG-LOGIC
- **Parallel with**: P4-HOOK-TASK-DATES (once this is merged)
- **Touches**: `src/hooks/useTaskDragDrop.js`, `src/contexts/TaskContext.jsx`
- **Branch**: `p4-hooks/task-dragdrop`
- **DoD**:
  - `TaskContext` slimmed down and delegates drag events to hook.
  - Hook exposes `handleDrop`, `handleDragStart`, etc.

### 4.5 Extract Date Logic Utilities

**ID:** P4-UTIL-DATE-ENGINE

- **Description**: Extract date recalculation logic into pure utility functions.
- **Depends on**: P3-UTIL-TEST-DATES
- **Parallel with**: P4-UTIL-DRAG-LOGIC (coordinate merge)
- **Touches**: `src/utils/DateCacheEngine.js`, `src/utils/dateEngineUtils.js`, tests
- **Branch**: `p4-utils/date-engine`
- **DoD**:
  - `recalculateDatesOptimistic` and related logic expressed as pure functions.
  - Tests confirm no behavioral regression.

### 4.6 Hook – useTaskDates

**ID:** P4-HOOK-TASK-DATES

- **Description**: Create `useTaskDates` hook and move date logic from context.
- **Depends on**: P4-UTIL-DATE-ENGINE
- **Parallel with**: P4-DRAG-DROP-DB-SEQUENCE (after merge)
- **Touches**: `src/hooks/useTaskDates.js`, `src/contexts/TaskContext.jsx`
- **Branch**: `p4-hooks/task-dates`
- **DoD**:
  - `TaskContext` delegates date recalculation to hook.
  - Hook exposes `recalculateAllDates`, `isTaskOverdue`, etc.

### 4.7 Drag & Date – Fix Recalculation Trigger and DB Sequence

**ID:** P4-DRAG-DROP-DB-SEQUENCE

- **Description**: Ensure DB sync is awaited before full date recalculation; move to sparse positioning.
- **Depends on**: P4-HOOK-DRAGDROP, P4-HOOK-TASK-DATES, P4-UTIL-SPARSE-POSITION
- **Parallel with**: None (high-risk central change)
- **Touches**: `src/hooks/useTaskDragDrop.js`, `src/hooks/useTaskDates.js`, `src/contexts/TaskContext.jsx`
- **Branch**: `p4-core/drag-date-sequence`
- **DoD**:
  - `onDrop` waits for DB update before triggering heavy date recalculation.
  - Only the moved task’s position is updated using sparse positioning.
  - Optional: show loading state/spinner for dates during recalculation.

---

## Phase 5: Resource Library & Reports (Feature Parallelism)

Goal: Add remaining partially coded features as isolated "mini-apps".

### 5.1 Resource Context

**ID:** P5-CTX-RESOURCE

- **Description**: Create a dedicated `ResourceContext` for resources.
- **Depends on**: P0-TYPES-DOMAIN
- **Parallel with**: P5-UI-RESOURCE-FILTERS, P5-REPORT-SERVICE
- **Touches**: `src/contexts/ResourceContext.jsx`
- **Branch**: `p5-context/resources`
- **DoD**:
  - Context provides `resources`, `loading`, `filters`, `setFilters`.
  - No coupling to `TaskContext`.

### 5.2 Resource Filter Bar Component

**ID:** P5-UI-RESOURCE-FILTERS

- **Description**: Build a reusable filter bar for resource list pages.
- **Depends on**: P5-CTX-RESOURCE
- **Parallel with**: P5-REPORT-SERVICE
- **Touches**: `src/components/Resources/ResourceFilterBar.jsx`, `src/components/Resources/ResourcesPage.jsx`
- **Branch**: `p5-ui/resource-filters`
- **DoD**:
  - Controlled filters for type (PDF, URL, etc.) and tags.
  - Emits filter changes via props.

### 5.3 Report Spec Domain Model

**ID:** P5-DOMAIN-REPORTSPEC

- **Description**: Define `ReportSpec` and related report types.
- **Depends on**: P0-TYPES-DOMAIN
- **Parallel with**: P5-REPORT-SERVICE, P5-REPORT-UI
- **Touches**: `src/types/domain.ts`
- **Branch**: `p5-domain/report-spec`
- **DoD**:
  - `ReportSpec` includes `projectId`, `month`, `range`, and optional filters.

### 5.4 Report Service – Monthly Status

**ID:** P5-REPORT-SERVICE

- **Description**: Implement `reportService` for generating monthly status data.
- **Depends on**: P5-DOMAIN-REPORTSPEC
- **Parallel with**: P5-REPORT-UI
- **Touches**: `src/services/reportService.js`
- **Branch**: `p5-service/reports`
- **DoD**:
  - `generateMonthlyStatus(projectId, month)` implemented and returns a typed result.
  - Unit tests using stubbed data.

### 5.5 Monthly Status Report View

**ID:** P5-REPORT-UI

- **Description**: Build `MonthlyStatusReport` component and print styles.
- **Depends on**: P5-REPORT-SERVICE
- **Parallel with**: P5-STORE-STRIPE-STUB
- **Touches**: `src/components/Reports/MonthlyStatusReport.jsx`, `src/components/Reports/MonthlyStatusReport.print.css`
- **Branch**: `p5-ui/monthly-report`
- **DoD**:
  - Consumes `generateMonthlyStatus` and renders summary by phase/milestone.
  - `@media print` styles hide navigation and chrome.

### 5.6 Store / Stripe Integration Stub

**ID:** P5-STORE-STRIPE-STUB

- **Description**: Add basic payment service stub behind a feature flag.
- **Depends on**: P0-LINT-BASE
- **Parallel with**: P5-REPORT-UI
- **Touches**: `src/services/paymentService.js`, `src/utils/config.js`
- **Branch**: `p5-store/stripe-stub`
- **DoD**:
  - `createCheckoutSession(items)` stubbed to log or return mock data.
  - Wrapped behind config flag so it’s safe to merge early.

---

## Summary of Parallelization Strategy

- **Phase 0–1**: High parallelism by separating contracts, tests, helpers, and UI wiring.
- **Phase 2**: Maximum parallelism; mostly new files (service, hook, UI, context) sharing a small, stable domain model.
- **Phase 3**: Parallel clean-up work by directory (components, hooks, utils) to reduce noise.
- **Phase 4**: Intentional bottleneck; sequential refactor of `TaskContext` with safeguards (flags, utilities, hooks).
- **Phase 5**: New features treated as mini-apps, with separate contexts, services, and UIs coordinated only through shared domain types.

This structure should safely support 3–5 active PRs per phase with minimal file overlap and clear dependency chains.

