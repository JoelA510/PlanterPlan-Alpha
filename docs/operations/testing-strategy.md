# PlanterPlan-Alpha test map and regression gate plan

## Repo Overview

### Observed

This repo describes itself as "PlanterPlan (Alpha)" and reports "Status: Alpha (Refactoring Phase)" with "Last Verified: 2026-01-31" and an explicit audience of "code reviewers, project managers." citeturn23view0

At the repo root, the visible inventory includes (non-exhaustive): `src/`, `docs/`, `supabase/`, `e2e/`, `playwright.config.ts`, `vite.config.js`, `eslint.config.js`, `package.json`, `package-lock.json`, and `TEST_PLAN.md`. citeturn31view4

The README documents the architecture and feature set using a modified Feature-Sliced Design layout under `src/` (e.g., `src/app/`, `src/features/`, `src/pages/`, `src/shared/`, `src/styles/`). citeturn23view1turn23view2

### Tech stack summary

- Frontend: React 18 + Vite + Tailwind CSS v4. citeturn24view0
- Database/auth: Supabase (Postgres) with Row Level Security (RLS) called out as enabled on `public.tasks` and `public.project_members`. citeturn24view0turn24view1
- Test tooling: Vitest + React Testing Library (unit/integration at the UI level), and Playwright infrastructure is present via `playwright.config.ts` and an `e2e/` directory. citeturn24view0turn31view4

## 4. Agentic Verification Layer (Manual/Hybrid)

Due to environment constraints blocking standard stdio capture, we utilize a **Hybrid Verification Strategy**:

1.  **Automated Specs**: We write standard Playwright specs (`e2e/**/*.spec.ts`) to serve as the source of truth and for local developer execution (`run_full_suite.sh`).
2.  **Agentic Execution**: The AI Agent uses the **Browser Subagent** to manually execute the critical paths defined in `docs/operations/agent-test-scripts.md`.
    *   **Pros**: Validates visual rendering, transitions, and "real" user interactions.
    *   **Cons**: Slower than headless automation.
3.  **Process**:
    *   Dev/Agent writes code.
    *   Agent checks `agent-test-scripts.md` for relevant flows.
    *   Agent invokes `browser_subagent` to execute the flow.
    *   Agent records the "Pass/Fail" result in `task.md` or PR description.
- Noted external dependencies: Supabase (via `src/app/supabaseClient.js`) and `dnd-kit` for drag-and-drop. citeturn32view0turn23view3

### Key scripts / commands

The README explicitly documents these commands:

- `npm run dev`
- `npm test`
- `npm test -- --run src/features/tasks/hooks/useTaskBoard.test.jsx`
- `npm run lint` citeturn32view0

`package-lock.json` exists, so the repository is (at least currently) aligned with npm lockfile workflows. citeturn31view4

### Test tooling config paths

- Playwright: `playwright.config.ts` (exists at repo root). citeturn31view4
- Vitest/RTL: called out in README as the testing stack; exact config file(s) are not retrievable from the repo content via the available evidence beyond the existence of `package.json` and the documented `npm test` usage. citeturn24view0turn32view0turn31view4

### Evidence-access limitation

I can fully read the README (embedded on the repo root page) and see the repo root inventory. However, attempts to fetch most individual source files (e.g., `src/...`, `docs/...`, `playwright.config.ts`, `TEST_PLAN.md`) fail in this environment (cache-miss behavior), so I cannot quote or verify implementation details inside those files beyond what the README asserts and what the repo root listing demonstrates exists. This constrains "Observed" evidence to what is present in the README and root file listing.

Current as of 2026-02-11.

Confidence: 65% (high for README-backed claims; low for anything requiring source-file inspection).

## Functional Map

### Observed workflow catalog

The README defines PlanterPlan as a project management tool in which projects are modeled as hierarchical task trees, with a templates vs instances concept and deep cloning from templates to instances. citeturn23view0turn23view3turn24view0

The following workflows are backed by README statements and/or the explicit data model summary in the README.

| WF ID | Workflow / feature | Roles / permissions (Observed) | UI entry points (Observed evidence) | Backend/API interactions (Observed evidence) | Data entities touched (Observed evidence) | Side effects (Observed evidence) | Failure modes / edge cases (Observed evidence) |
|---|---|---|---|---|---|---|---|
| WF-001 | Authentication and session persistence | "Project Managers" are the described user archetype; auth is via Supabase Auth (JWT) and managed in `AuthContext`. RLS is enabled on key tables. | `src/app/contexts/AuthContext.jsx` is referenced as the auth logic location. | Supabase Auth (JWT) via `AuthContext.jsx`; Supabase client exists at `src/app/supabaseClient.js`. | (Implicit) auth/session plus RLS-protected tables. | None stated. | None stated. |
| WF-002 | Task hierarchy as core domain model | RLS is stated as enabled on `public.tasks`. | Task routes live in `src/app/App.jsx`; main task dashboard is `TaskList.jsx`. | Task service module `src/features/tasks/services/taskService.js` handles "fetch, search, clone". | `tasks` with `parent_task_id`, `root_id`, etc. | None stated. | Performance note: `fetchTaskChildren` uses in-memory BFS (not recursive DB), which may limit performance on large trees. |
| WF-003 | Templates vs Instances: deep cloning a template tree into a project instance | Implied permissions via `project_members` and role-based access; "View-As Switcher" exists for role testing. | Creation via hook `useProjectMutations` is documented; UI routes not enumerated. | `deepCloneTask` in `taskService.js`; example usage: `createProject({ title, templateId })`. | `tasks` (origin field), `view_master_library` view to filter templates. | None stated. | None stated beyond BFS limitation potentially affecting cloning/fetching large trees. |
| WF-004 | Master Library search and tree browsing (templates) | No explicit role list; RLS and shared-project permissions exist via `project_members`. | Components referenced: `MasterLibraryList.jsx` (tree view). | `searchMasterLibraryTasks` is referenced as the template search. | `view_master_library` described as filtering root templates; `tasks` and possibly `task_resources`. | None stated. | None stated. |
| WF-005 | Project reporting (print view with completion stats) | Not specified. | `ProjectReport.jsx` is referenced. | Not specified. | Likely `tasks` (completion status) but only "completion stats" is stated. | Print/export implied only as "print view"; no external export mechanism stated. | None stated. |
| WF-006 | Navigation patterns: app sidebar + project sidebar, responsive dashboard layout | Not specified, but supports project context switching. | `AppSidebar.jsx`, `ProjectSidebar.jsx`, `DashboardLayout.jsx`. | Not specified. | Not specified. | None stated. | None stated. |
| WF-007 | People/CRM lite: team members, roles, statuses | Explicitly mentions roles and statuses; suggests permissions model. | `PeopleList` view is referenced. | `peopleService.js` referenced. | Implied link to `project_members` (managing roles) but the README only explicitly lists `project_members` as permissions table. | None stated. | None stated. |
| WF-008 | Checkpoints (gated phases unlock) | Implies role/permission + task completion gating. | `PhaseCard.jsx` referenced. | Not specified. | Likely `tasks` plus some phase metadata; not specified. | None stated. | "Completion of previous phase to unlock" is the key edge behavior stated. |
| WF-009 | Mobile Field Mode: quick-action FAB and "Today's Agenda" | Not specified. | "FAB" and "Today's Agenda" are described, but component names are not cited. | Not specified. | Implies time/agenda logic; no data tables cited. | None stated. | Scheduling/time-based determinism is a risk given "Today's Agenda" (but not proven in code). |
| WF-010 | Dark mode: system sync + persistent toggle | Not specified. | `ThemeContext.jsx` referenced. | Not specified. | Preference persistence implied ("persistent toggle"). | None stated. | None stated. |
| WF-011 | List virtualization: supports larger projects (50+ tasks) | Not specified. | `ProjectListView.jsx` referenced. | Not specified. | Likely `tasks`; not specified. | None stated. | Rendering/perf edge case ("50+ tasks") is explicitly called out. |
| WF-012 | View-As switcher: admin preview mode for role testing | Mentions admin preview mode and role testing. | `ViewAsContext.jsx` referenced. | Not specified. | Likely `project_members` roles; not specified. | None stated. | Role boundary correctness is an implied edge case. |

Evidence for the workflows above comes from the README sections "Where to Find Things," "Tech Stack," "Database Schema," and "Current State / Working Features." citeturn23view2turn24view0turn24view1turn32view1

### Inferred and explicitly not proven

- Exact route paths (URL structure) are not observable because `src/app/App.jsx` cannot be retrieved here; only its existence and role as routing is documented by the README. citeturn23view2
- Exact Supabase RLS policies, constraints, and triggers are not observable because `docs/db/schema.sql` cannot be retrieved here; only a summary is present in the README. citeturn24view0turn24view1
- The specific behavior of "Today's Agenda" (deadline logic, timezone handling) is not observable from code; it is mentioned as a feature. citeturn32view1

## Existing Test Inventory

### Observed

The repo root inventory indicates an e2e harness is intended or present:

- `e2e/` directory exists.
- `playwright.config.ts` exists at repo root. citeturn31view4

The README explicitly references at least two test artifacts:

- A specific test command referencing `src/features/tasks/hooks/useTaskBoard.test.jsx`. citeturn32view0
- A "Golden Paths" test file named `golden-paths.test.jsx` that tests dashboard/board/navigation flows. citeturn32view1

The README also claims the test stack is "Vitest, React Testing Library." citeturn24view0

### Test files / suites enumerated from evidence

Because individual test files cannot be retrieved, the inventory below is limited to the tests explicitly named in the README plus the presence of Playwright config.

| Test artifact (Observed name/path) | Likely level (Observed vs inferred) | Framework (Observed vs inferred) | What it covers (Observed vs inferred) | Mocks/fixtures (Unknown) | CI stability risk (Inferred) |
|---|---|---|---|---|---|
| `src/features/tasks/hooks/useTaskBoard.test.jsx` | Unit/integration (inferred from being a hook test) | Likely Vitest + RTL per README (inferred) | Task board hook behavior (inferred; only the filename/path is observed) | Unknown | Medium: hook tests can be stable if DOM + timers are controlled; risk rises if they depend on real Supabase/network. |
| `golden-paths.test.jsx` | Integration-style UI test (inferred from "dashboard, board, navigation flows") | Likely Vitest + RTL per README (inferred), unless it is Playwright (not stated) | "Golden Paths tested for Dashboard, Board, and Navigation flows" (observed claim) | Unknown | Medium-to-high: "golden path" tests often become brittle if selectors and async state are not deterministic. |
| `playwright.config.ts` + `e2e/` dir | E2E harness present (observed) | Playwright (inferred from config filename and repo naming conventions; not stated in README) | Unknown (cannot list specs without directory access) | Unknown | Medium: typically stable if seeded DB and selectors are stable; high if tests use shared preview env without seeding. |

Evidence: README test command + golden-path reference + toolchain statement; repo root inventory showing `e2e/` and `playwright.config.ts`. citeturn32view0turn32view1turn24view0turn31view4

### Likely gaps (framed as gaps because file content is not observable)

- Missing evidence of DB/RLS integration tests that assert allow/deny behavior on `public.tasks` and `public.project_members`. The need is high because the README explicitly calls out RLS on those tables. citeturn24view0turn24view1
- Missing observable unit coverage for the core tree model (task hierarchy, deep clone, BFS fetching) beyond the mentioned hook test. The README emphasizes hierarchy and deep cloning as core concepts. citeturn23view3turn24view2turn24view3

## Required Test Map

### Coverage matrix (workflow -> unit -> integration -> e2e)

This matrix defines what should exist now to gate regressions, given the documented design: task-tree core, template cloning, RLS-protected data, drag-and-drop UI, role testing, and a small set of critical views (dashboard, master library, report, people). citeturn23view0turn24view0turn24view2turn24view3

Priorities:
- P0: must run on every PR (fast + deterministic).
- P1: should run on PRs but can be heavier; if too heavy, nightly.
- P2: extended regression and edge cases; typically nightly/on-demand.

| Workflow | Unit tests (what must be proven) | Integration tests (what must be proven) | E2E tests (smoke vs regression) | Priority | Effort / prerequisites |
|---|---|---|---|---|---|
| WF-001 Auth/session | Context reducer/state transitions; "signed out -> signed in -> persisted" flows without network (mock Supabase client). | Contract test around Supabase auth wrapper calls (if wrapped). | Smoke: sign-in -> land on dashboard; sign-out -> redirected. | P0 | Need testable auth adapter boundary; stable selectors on sign-in UI. |
| WF-002 Task tree model | Pure functions: tree building from adjacency list, root_id invariants, BFS ordering rules, "move task" rules (if any), completion propagation rules (if any). | Service tests for `fetchTaskChildren` using deterministic fixtures (mock Supabase responses). | Regression: open a project with a moderately deep tree and verify rendering + virtualization doesn't drop nodes. | P0 | Needs fixture builders for tasks and a deterministic "now" clock if due-date logic exists. |
| WF-003 Deep clone template -> instance | Pure clone transformation: origin changes, parent/child edge preservation, resource copy semantics, stable mapping of old->new IDs (use seeded RNG in tests). | Integration against DB: cloning writes the expected number of rows and preserves structure. | Smoke: create project from template and see tasks appear. | P0 | Requires stable ID generation or injectable UUID provider in clone logic. |
| WF-004 Master library search/tree | Search filtering rules, resource-type filter logic, pagination behavior (unit). | Integration: `view_master_library` returns only root templates; RLS does not leak templates across orgs/projects. | Smoke: search for a template and expand tree nodes. | P1 | Needs seeded templates and ability to run DB view in CI. |
| WF-005 Project report | Stats calculations (counts, percent complete) as pure functions. | Integration: report query uses only authorized tasks; RLS deny works. | Smoke: open report view and verify key summary numbers. | P1 | Needs deterministic completion data fixture. |
| WF-006 Navigation | Route config mapping (unit) if abstracted; sidebar state machine. | Integration: nav is role-aware with View-As. | Smoke: switch projects using sidebar; verify proper context switching. | P0 | Add `data-testid` to nav items + project switcher. |
| WF-007 People/CRM lite | Role/status validation and transformations. | Integration: `project_members` allow/deny for role changes; RLS enforced. | Smoke: view people list; update a member role (if supported). | P1 | Needs seeded users and membership states; some flows may be admin-only. |
| WF-008 Checkpoints gating | Gating algorithm (phase unlock rules) pure unit tests incl edge cases (missing phase, partial completion, reorder). | Integration: persistence of checkpoint completion; deny on skipping prerequisites. | Regression: complete phase A, verify phase B unlocks; attempt to jump and confirm blocked. | P1 | Requires deterministic ordering of phases and stable completion flags. |
| WF-009 Mobile field mode / agenda | Time-window selection logic (unit) with timezone cases (DST boundaries, midnight local). | Integration: agenda query correctness under RLS. | Optional regression: simulate "today" and verify agenda list. | P2 (upgrade to P0 if mission critical) | Requires hard time control; do not use real system clock in tests. |
| WF-010 Dark mode | ThemeContext toggle persistence (localStorage wrapper) and system preference mapping. | Integration: none (unless stored server-side). | Smoke: toggle theme and verify persisted after reload. | P2 | Needs stable selectors on theme toggle; consider disabling transitions in tests. |
| WF-011 Virtualized list | Virtualization boundary behavior: renders correct items for scroll offsets (unit with DOM + virtualization adapter). | Integration: none. | Smoke: open large list; scroll; verify no blank states. | P1 | Needs deterministic list virtualization and stable test IDs on row items. |
| WF-012 View-As switcher | Role override state machine and permission resolution rules. | Integration: role-based visibility/abilities align with server/RLS reality (avoid client-only RBAC drift). | Smoke: switch view-as and confirm restricted actions disappear. | P1 | Needs clear role matrix and seeded membership roles. |

Evidence anchor: the set of workflows and their components/services/entities come from the README "Working Features", "Database Schema", and "Security Model". citeturn24view0turn24view1turn24view2turn24view3

### P0 suite definition (minimum PR gate)

Given the repo is alpha and refactoring, P0 must be small, deterministic, and fail-fast:

- Lint (fast).
- Unit tests for core tree + clone + gating (fast, deterministic).
- A minimal UI integration set ("golden paths" style) limited to a small number of flows.
- E2E smoke limited to 1-3 tests max (only if the environment is fully seeded and deterministic).

This aligns with a test pyramid preference (unit -> integration -> minimal e2e) and explicitly avoids a brittle "everything is e2e" anti-pattern. The README already suggests an intent toward "Golden Paths" coverage. citeturn32view1turn24view2

## Test Implementation Plan

### Order-of-operations backlog (dependency-aware)

Because the repo already uses Vitest/RTL and has Playwright scaffolding, the fastest path to a deterministic PR gate is to first harden unit boundaries and fixtures, then add DB/RLS integration, then add Playwright smoke last. citeturn24view0turn31view4turn32view0

| Step | Outcome | Files/folders to create/modify (recommended) | Standardize patterns | Determinism controls |
|---|---|---|---|---|
| 1 | Establish test conventions and "no network by default" rule | `src/shared/test/` (helpers), `src/shared/test/factories/` (builders), `src/shared/test/msw/` (only if you already use MSW; otherwise keep local mocks) | Factories/builders for `tasks`, `project_members`, `task_resources`; a single `renderWithProviders` helper | Centralize time control (Vitest fake timers) and a seeded RNG helper for any ID-like generation |
| 2 | Unit-test the task tree core | Add unit tests under `src/features/tasks/...` adjacent to pure logic | Pure functions must be extracted into `src/shared/lib/` or `src/features/tasks/lib/` to avoid React coupling | Freeze time; avoid random UUIDs unless injectable; snapshot-only tests disallowed for core logic |
| 3 | Unit-test deep clone invariants | Add/expand tests for `deepCloneTask` behavior (as described by README) | Clone-result assertions: structural equality, origin changes, resource linkage, root_id correctness | Use deterministic ID mapping by injecting an "idFactory" into clone logic |
| 4 | Harden "golden paths" UI tests into stable integration tests | Locate/standardize `golden-paths.test.jsx` and reduce it to a small, stable set | Prefer RTL queries + `data-testid` on navigation + key actions; keep tests at workflow boundaries | Disable CSS transitions; mock Supabase client at the service boundary; use explicit awaits for async UI |
| 5 | Add RLS integration tests for tasks + memberships | Add an `integration/` test suite that runs against a real local Supabase stack | Test harness that seeds DB + applies migrations + uses two users (allowed vs denied) | Run each test in isolated schema transaction or reset-and-seed per job; no cross-test data coupling |
| 6 | Add Playwright smoke suite (minimal) | `e2e/smoke/*.spec.ts` (or current repo conventions) + CI artifacts | Page objects for Dashboard, Master Library, Project view, People view; consistent `data-testid` contracts | Use seeded DB state + dedicated test user; run headless; record trace on failure only |
| 7 | Expand to P1/P2 coverage | Add targeted tests for checkpoints, virtualization, theme, view-as | Naming: `*.unit.test.*`, `*.int.test.*`, `*.e2e.spec.*` to enable filtering | Separate slow/flaky tests and quarantine with explicit allowlist, not "retries hide flakes" |

### Where to add `data-testid` (recommended, grounded in named components)

Because the README explicitly names the main navigation and task list components, they are the highest ROI places for stable E2E selectors:

- `AppSidebar.jsx`: nav container + per-route item (stable selectors for nav). citeturn24view0
- `ProjectSidebar.jsx`: project switcher and project-scoped nav entries. citeturn24view0
- `TaskList.jsx`: task rows, drag handles (if any), and expand/collapse affordances. citeturn24view0
- `PeopleList` view: "add member", "edit role", row identity. citeturn32view1
- `PhaseCard.jsx`: lock/unlock state and "complete phase" action. citeturn32view1

Avoid `data-testid` on purely presentational "shared/ui" atoms unless they are the only stable hook; prefer semantic roles/text for small components and reserve `data-testid` for workflow-critical affordances (nav, create, save, clone, gating, role switch).

## CI / PR Gate Design

### Observed constraints and anchors

- The repo uses npm commands in README and includes a `package-lock.json`. citeturn32view0turn31view4
- Playwright config exists (`playwright.config.ts`) and an `e2e/` directory exists. citeturn31view4
- The app is Supabase-backed and explicitly calls out RLS on `public.tasks` and `public.project_members`. citeturn24view0turn24view1

### Proposed PR gate job graph (fast fail first)

Recommended order for required checks:

1. `lint` (fastest feedback)
2. `typecheck` (if TypeScript is used in the build; repo language mix suggests some TS exists)
3. `unit` (Vitest in CI run mode)
4. `integration-db` (Supabase local + RLS tests)
5. `e2e-smoke` (Playwright, minimal)

A separate `e2e-full` should be optional on PR and run nightly, to avoid blocking merges on slow UI suites.

### Exact commands (as they should exist)

These commands are expressed as desired CI interface; because `package.json` contents are not retrievable here, treat these as the target scripts to add/align:

- `npm ci`
- `npm run lint` (already documented) citeturn32view0
- `npm run typecheck` (add if not present)
- `npm test -- --run` or `npm test` depending on how `npm test` is wired (README shows `npm test` exists). citeturn32view0
- `npx playwright install --with-deps` (Playwright CI install step) citeturn35search9
- `npx playwright test --project=chromium` (smoke) and optionally full matrix in nightly.

Playwright CI guidance: Playwright’s docs explicitly note caching browser binaries is generally not recommended because restore time can rival download time, and OS deps are not cacheable. citeturn35search3

Supabase CI guidance: Supabase docs describe running the full stack locally (including in CI) via `supabase init` and `supabase start`. citeturn34search0turn34search3

Important: Supabase CLI docs (when run via `npx`) note a Node.js 20+ requirement. That affects CI Node version selection if you choose `npx supabase ...`. citeturn34search0

### Environment strategy for integration tests

Two viable patterns (choose one; both can be deterministic):

- Local Supabase in CI:
  - Use Supabase CLI `supabase start` to bring up Postgres + services, apply migrations, seed data. Supabase CLI reference shows migrations and seeding behaviors during start. citeturn34search2turn34search0
  - Pros: deterministic, no external dependency.
  - Risks: slower startup; needs Docker.

- Ephemeral Supabase project per PR:
  - Not recommended as P0 because it adds external flakiness, quota, and secret management overhead, and can become non-deterministic.

Given the repo explicitly relies on RLS, local Supabase in CI is the safer default for regression gating because you can prove allow/deny behavior every PR. citeturn24view1turn34search0

### Caching and artifacts

- Cache `~/.npm` or npm cache directory (standard). (No repo citation required.)
- Do not cache Playwright browsers by default (per Playwright guidance); if you do, pin cache key to Playwright version. citeturn35search3turn35search9
- Upload artifacts:
  - Unit/integration coverage reports (if coverage is enabled).
  - Playwright traces / screenshots / videos on failure only (Playwright + GitHub actions support artifact uploads). citeturn35search9turn35search3

### Flake policy

- Retries:
  - Allow Playwright retries = 1 in CI for smoke only, but require automatic trace capture to investigate.
  - Unit/integration retries should generally be 0; flakes there usually indicate time/randomness leakage.

- Quarantine:
  - Use an explicit quarantine tag allowlist and a tracking issue; do not silently skip.

## Risk Register

This is a regression risk list derived from the documented feature set and architecture emphasis.

| Risk | Why it is high-risk here (Observed evidence) | Test control to mitigate |
|---|---|---|
| Task tree correctness regressions | The README makes task hierarchy the core mental model and notes optimization via `root_id` and a BFS-based fetch implementation. citeturn23view3turn24view2turn24view3 | P0 unit tests on pure tree functions and `fetchTaskChildren` semantics with fixtures; property-based tests for tree invariants (no cycles, stable parent/child links). |
| Deep clone regressions | Deep cloning templates into instances is explicitly a core supported workflow. citeturn23view3turn24view2 | P0 unit tests for clone invariants + P0 e2e smoke: create project from template and verify node count + structure. Inject deterministic ID generator. |
| RLS/access drift | RLS is explicitly enabled on `public.tasks` and `public.project_members`, and a role model exists (`project_members.role`, view-as switcher). citeturn24view0turn24view1turn32view1 | Integration tests on local Supabase proving allow/deny for common operations (read project, clone template, change member role). Ensure client UI respects server truth (no client-only RBAC). |
| Drag-and-drop brittleness | `dnd-kit` is explicitly called out as a dependency for drag-and-drop interactions. citeturn23view3 | Keep DnD mostly unit/integration (simulate events) and only 1-2 e2e DnD tests max; add `data-testid` on drag handles; avoid pixel-based assertions. |
| "Golden path" UI flakiness | "Golden Paths tested for Dashboard, Board, and Navigation flows" is explicitly mentioned, implying a broad UI test. citeturn32view1 | Reduce to a small number of stable assertions, add stable selectors, avoid waiting on network without deterministic mocks/seeding. |
| Checkpoints gating regressions | "Checkpoints: gated phases requiring completion of previous phase to unlock" is explicit. citeturn32view1 | Unit test gating algorithm with edge cases; integration test persistence; single e2e workflow verifying lock/unlock behavior. |
| Time/scheduling nondeterminism | "Today's Agenda" implies date-sensitive selection rules; this kind of logic is typically flaky without time control (only feature mention is observed). citeturn32view1 | If agenda logic exists in code, require deterministic unit tests with frozen time + timezone cases; avoid relying on system clock in e2e. |
| Performance regressions in large projects | The README calls out virtualization and large lists (50+ tasks), and BFS fetching limitations. citeturn24view3turn32view1 | Add integration tests that render large lists and validate stable row identity; avoid e2e perf assertions, but add targeted unit tests around virtualization window logic if abstracted. |

Current as of 2026-02-11.

Confidence: 60% overall (high confidence for the workflow list and risks as described in README; low confidence for missing/extra tests and exact CI commands because source files and configs beyond README could not be retrieved here).
