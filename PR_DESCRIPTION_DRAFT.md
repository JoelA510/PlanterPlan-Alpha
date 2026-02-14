# Pull Request: Project/Task Core Overhaul -> Recursive Hierarchy + Drag/Drop Date Inheritance + Auth/App Reliability + Playwright E2E

## Objective

Ship the final, consolidated state of the forked branch to upstream:

* Deterministic project creation and routing (including a first-class "Start from scratch" flow) with RLS-safe initialization.
* True recursive task hierarchy rendering.
* Recursive drag-and-drop (reorder + reparent) with subtree date inheritance and atomic persistence.
* Reliability hardening (auth startup, error boundaries, mutation error surfacing, client-side RBAC UX, query defaults).
* Playwright E2E infrastructure with comprehensive journey coverage, stable auth seeding, and deterministic network mocking.

---

## Net changes (final state)

### 1) Project creation -> RLS-safe initialization + consistent navigation

**Final behavior**

* Creating a project always uses a SECURITY DEFINER Supabase RPC for initialization, ensuring the creator is correctly provisioned as a member at creation time (prevents RLS deadlocks/races and post-create permission gaps).
* `CreateProjectModal` exposes **template creation** and **"Start from scratch"** as explicit options.
* On success, the dashboard navigates directly to the new board route: `/project/[id]`.

**Primary files**

* `src/features/projects/services/projectService.js` (RPC-backed creation)
* `src/features/dashboard/components/CreateProjectModal.jsx` (template/scratch selection + client-side validation)
* `src/pages/Dashboard.jsx` (post-create redirect)

---

### 2) Tasks -> recursive hierarchy rendering from flat data

**Final behavior**

* Task UI renders an arbitrarily deep parent/child structure (folder-like nesting).
* Flat task query results are transformed into a stable nested tree using shared tree helpers.

**Primary files**

* `src/shared/lib/treeHelpers.js` (`buildTree`, `flattenTree`, memoized where applicable)
* Task rendering components (`TaskItem`, `SortableTaskItem` rendering path) updated for recursive children

---

### 3) Drag & drop -> reorder + reparent + subtree date inheritance

**Final behavior**

* Drag-and-drop supports:

  * Reordering tasks within the same parent.
  * Reparenting tasks across milestones/containers via `parent_task_id` updates.
* When a task is dropped into a new time context, the **entire subtree** inherits the date shift (delta applied to all descendants).
* Persistence is performed as atomic batch updates (positions + parent change + date deltas).
* UI provides clear affordances and feedback: drop-target highlight, cursor states, and toasts describing the result (including affected subtree count when applicable).

**Primary files**

* `src/features/task-drag/useTaskDrag.js`
* `src/features/task-drag/dateInheritance.js`
* `src/features/task-drag/positionService.js`

---

### 4) Architecture -> FSD alignment + optimistic UI recovery

**Final behavior**

* Task domain is split along Feature-Sliced Design boundaries:

  * `src/entities/task` -> task data/schema concerns
  * `src/features/task-drag` -> drag/drop behavior
* Mutations follow a consistent optimistic update pattern with context-aware rollback so UI returns to a correct state immediately on API failure.

**Primary files**

* `src/entities/task/*`
* `src/features/task-drag/*`
* `useTaskMutations` (standardized optimistic/rollback via `commitOptimisticUpdate`)

---

### 5) App reliability -> auth startup, error surfacing, boundaries, query defaults, RBAC UX

**Final behavior**

* Auth startup no longer relies on broad race-based timeouts; role resolution uses a bounded timeout wrapper for the admin-role RPC call to prevent hangs while avoiding spurious role downgrades.
* Critical mutations surface errors to users via toasts; swallowed errors are removed.
* Query behavior is stabilized via safe `QueryClient` defaults (reduced refetch churn, bounded retry).
* Error handling is standardized using `react-error-boundary` with consistent reset behavior.
* Client-side RBAC gates remove/disable editing and invitation controls for unauthorized roles (UX guardrails only; server policies still authoritative).
* Settings UX includes validation for profile fields (e.g., avatar URL) and uses the planter client adapter for profile updates.

**Primary files**

* `AuthContext.jsx` (bounded `is_admin` RPC call)
* `src/pages/Project.jsx`, `src/pages/Dashboard.jsx` (error toasts, isError states, removed debug artifacts)
* `src/main.jsx` (QueryClient defaults)
* `App.jsx`, `TaskList.jsx`, `TaskItem.jsx` (react-error-boundary)
* `Settings.jsx` (validation + `planter.auth.updateProfile()` adapter)

---

### 6) Theming -> semantic tokens for dark/light compatibility

**Final behavior**

* UI uses semantic design tokens in key surfaces so components respond correctly to dark/light mode without hardcoded colors.

**Primary files**

* `Project.jsx`, `Settings.jsx`, `Reports.jsx`, `Home.jsx` (token migration)

---

### 7) Database policy hygiene (where applicable)

**Final behavior**

* RLS/policy expressions are aligned for improved query planning by using `(select auth.uid())` patterns in relevant places.

**Primary files**

* `schema.sql` (RLS/planning improvements)

---

### 8) SSoT Documentation & Workflows

**Final behavior**

*   **Full Architecture Reference**: Added `docs/FULL_ARCHITECTURE.md` as the verifiable Single Source of Truth, covering FSD structure, state management, provider tree, and security model.
*   **Deep Research Report**: Added `deep-research-report.md` documenting the initial codebase audit, tech stack analysis, and test coverage gaps.
*   **Agentic Workflows**: Consolidated operational logic into `.antigravity/` and `.agent/workflows/` (including `verify-e2e.md` for hybrid agentic verification).

**Primary files**

*   `docs/FULL_ARCHITECTURE.md` (New SSoT)
*   `deep-research-report.md` (Audit)
*   `REFACTOR_PLAN.md` (Roadmap)
*   `.antigravity/*` (Operational Guide & Rules)
*   `.agent/workflows/*` (E2E workflows)

---

## E2E testing (final state)

**Final behavior**

* Playwright is configured for local and CI usage.
* Dev server can be auto-started via `webServer` configuration (where enabled).
* E2E tests are stable through:

  * Auth seeding (bypassing fragile local checks)
  * Deterministic `page.route` network mocking
  * Environment-gated bypass logic (`VITE_E2E_MODE`)
  * Secrets/credentials sourced from environment variables (no hardcoded JWT/test creds)

**Primary files**

* `playwright.config.ts`
* `e2e/` journey suites (auth/security, creation, CRUD, drag/drop, collaboration/RBAC, UI/theme)
* `run_full_suite.sh`
* `.agent/workflows/verify-e2e.md`
* `playwright-e2e-testing-system.md`, `testing-roadmap.md`
* `PR_TEMPLATE.md`

---

## Validation (as reported in this branch)

* Unit/integration coverage includes:

  * project creation + RLS path
  * recursive hierarchy rendering
  * drag/reparent interactions
  * date inheritance math
  * optimistic rollback correctness
  * auth stability regression
* E2E coverage includes:

  * auth + security gates
  * golden paths for core journeys (including project creation)
  * drag/drop
  * theme integrity and general UI interactions (where present)

---

## Notes

* Client-side RBAC is implemented as UX enforcement; server-side RLS remains the source of truth.
* SECURITY DEFINER RPCs should be reviewed for least-privilege and safe configuration (validation, search_path, no user-controlled SQL).
