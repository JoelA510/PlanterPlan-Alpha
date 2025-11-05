# PlanterPlan — vNext Granular Roadmap (Merged)

**Scope & Sources**
This is a highly‑granular roadmap that reconciles:

* The legacy `ROADMAP.md` (main) items for **Refactor & Consolidate**, **TypeScript & Tests**, and **DX/Perf/Deploy**; and
* The **Post‑Refactor Product Roadmap (vNext)** currently on the **`refactor` branch**, which reflects repo reality after PRs #8–#13.

**Goal**
Enable **small, fast PRs** that are easy to review and roll back. Each sub‑item is scoped to a single, reviewable change when possible. Use the branch names indicated and keep each PR to one sub‑section (`x.y.z`) or smaller.

**Repo Conventions**

* **Env:** CRA envs only (`REACT_APP_*`). No secrets or full URLs in code. `.env.local` is gitignored.
* **Branching:** one purpose per branch (e.g., `fix/search-highlight-description`).
* **Commits:** Conventional Commits (e.g., `fix(search): include description in highlight`).
* **Lockfile:** if deps change, sync `package-lock.json` in a dedicated **deps/sync** PR.
* **CI:** `npm ci` + `npm run lint` + `npm run build` must pass.
* **RLS:** any DB/table change includes at least one read + one write policy.

---

## Phase 0 — Baseline & CI Green (stabilize main)

**Goal:** CI is green; lint hygiene is enforced; post‑refactor baseline is locked.

### 0.1 Lint & Type Hygiene

* **0.1.a** Replace/implement `filterOutOrphans` in `TaskContext` with a tested helper; add unit tests.
* **0.1.b** Add missing hook deps (`useMemo`/`useCallback`) across `Reports`, `TaskList`, `TaskForm`.
* **0.1.c** Replace faux links with `<button>` or valid `<a href>` to satisfy `anchor-is-valid`.
* **0.1.d** Remove unused vars surfaced by ESLint (e.g., `navigate`, `user`).
* **0.1.e** Ensure default `switch` cases where required.
* **0.1.f** Centralize ESLint config at repo root; verify CI runs `npm run lint && npm run build`.
  **Acceptance:** CI green; warnings minimized or documented via inline disable + rationale.

### 0.2 Abortable Fetch Standard

* **0.2.a** Adopt `AbortController` consistently in `taskService`, search adapters, and list hooks.
* **0.2.b** Wire `.abortSignal(signal)` for Supabase queries; return empty arrays on cancellation.
* **0.2.c** Add a shared `createAbortable()` helper and tests for “no state update after unmount”.
  **Acceptance:** No fetch races; cancelling navigation or keystrokes stops pending work.

---

## Phase 1 — Search & Library UX (polish what exists)

**Goal:** Master Library and Search are performant, cancellable, accurate, and consistent.

### 1.1 Master Library Data Access

* **1.1.a** Implement `taskService.fetchMasterLibraryTasks({ from, limit, signal })`.
* **1.1.b** Validate response shape; normalize to `Task[]`; return `[]` on non‑fatal error.
* **1.1.c** Add indices for pagination fields on `view_master_library` (e.g., `id`, `created_at`).
  **Acceptance:** Paged, cancellable requests; no console race errors; safe on unmount.

### 1.2 MasterLibraryList UI

* **1.2.a** Keep Tailwind styling; remove any inline styles.
* **1.2.b** Implement **loading/empty/error** states.
* **1.2.c** Add Prev/Next pager; disable when `isLoading` or `tasks.length < limit`.
* **1.2.d** Add ARIA labels on actionable controls.
  **Acceptance:** Smooth pagination; accessible controls; consistent styling.

### 1.3 Library Search in Forms

* **1.3.a** Embed a “Search & pick from Master Library” slot in **Project Template** and **Project Task** forms.
* **1.3.b** Selecting a library item copies fields into the draft; preserve form validation.
* **1.3.c** Provide in‑place “Create new Resource” (modal/inline) when search misses.
* **1.3.d** Debounce queries (250–400ms) with a shared `useDebounce` hook.
* **1.3.e** Keyboard navigation: ↑/↓/Enter + `aria-activedescendant`.
  **Acceptance:** Add from Library without leaving the form; feels instantaneous; keyboard friendly.

### 1.4 Search Consistency & Highlighting

* **1.4.a** Keep regression fix: search **title + description**.
* **1.4.b** Align highlighting to the same fields.
* **1.4.c** Tests: task with keyword **only in description** must be returned & highlighted.
  **Acceptance:** Results and highlights match fields searched.

---

## Phase 2 — Template Task CRUD & Date Engine (MVP)

**Goal:** Template Tasks are fully CRUD‑capable; minimal, correct date propagation exists.

### 2.1 Template Task CRUD

* **2.1.a** Implement add/edit/delete with stale‑list refresh after mutation.
* **2.1.b** Fix “Task not found” by normalizing IDs; disable optimistic update for now.
* **2.1.c** Eliminate delete loops by tightening hook deps.
* **2.1.d** Add **notes** and **days_from_start** columns (migration).
* **2.1.e** Wire form fields + validation + Supabase persistence; display on read.
  **Acceptance:** End‑to‑end CRUD works; notes & offsets persist; no loops/stale data.

### 2.2 Date Engine (Minimum Viable)

* **2.2.a** On project instantiation, compute task dates from **project start + days_from_start**.
* **2.2.b** Maintain phase/milestone inheritance (parent start = min child start; end = max child end).
* **2.2.c** On add/remove/reorder, recompute **only** affected ancestors.
* **2.2.d** Manual date edits do **not** auto‑cascade to children (explicit action required).
* **2.2.e** Defer complex duration models; add backlog item for “duration vs. offset”.
  **Acceptance:** New projects & hierarchy changes yield correct dates; manual edits persist; no global recompute storms.

### 2.3 Tests for CRUD + Dates

* **2.3.a** Unit: validate offset → date mapping and inheritance rules.
* **2.3.b** Integration: template → project instantiation; list refresh; delete flows.
  **Acceptance:** Green tests gate the CRUD/date engine.

---

## Phase 3 — Team Management (roles enforced)

**Goal:** Roles exist and are enforced server‑side (RLS/policies) with clear UI affordances.

### 3.1 Roles & Permissions

* **3.1.a** Define roles: **Owner**, **Full User**, **Limited User**, **Coach** (schema/constants).
* **3.1.b** Implement RLS/policies to enforce role scopes on project/task tables.
* **3.1.c** Client gates: hide/disable controls based on role; show role badges in UI.
* **3.1.d** Ensure “joined but don’t own” projects are visible via membership.
  **Acceptance:** Authorized ops succeed; unauthorized fail gracefully; invites add membership rows; badges render.

### 3.2 Real‑Time Consistency

* **3.2.a** Subscribe to project‑scoped changes with Supabase channels.
* **3.2.b** Update TaskContext caches on incoming changes; dedupe by primary key + version.
  **Acceptance:** Owner/member views stay in sync without refresh.

### 3.3 Permission Service (from legacy Roadmap)

* **3.3.a** Create `permissionService` centralizing role/permission checks.
* **3.3.b** Refactor existing checks to use it; add unit tests.
  **Acceptance:** Single source of truth for permissions; tests cover each role.

---

## Phase 4 — Project Status Reports (functional)

**Goal:** Month‑end reporting that’s useful and accessible.

### 4.1 Report Data & Filters

* **4.1.a** Month selector (default previous month).
* **4.1.b** Derive lists: **Completed in month**, **Overdue as of month end**, **Due next month**; exclude archived projects.
  **Acceptance:** Changing month recomputes lists correctly.

### 4.2 Visualization & A11y

* **4.2.a** Progress donut from task completion ratio (weights optional, later).
* **4.2.b** Add legend with counts; ensure semantic headings and contrast.
  **Acceptance:** Chart + legend render; keyboard/screen‑reader friendly.

---

## Phase 5 — Resource Library (complete the loop)

**Goal:** Resources are first‑class and usable from Master Library and tasks.

### 5.1 Resource CRUD & Linking

* **5.1.a** Ensure Resource Library supports add/edit/delete/list/detail.
* **5.1.b** Task and Library forms: attach existing Resource via searchable picker.
* **5.1.c** Create Resource inline when missing (modal/inline).
  **Acceptance:** Resources can be attached/created during task editing; links render consistently.

### 5.2 File Upload (Optional)

* **5.2.a** Secure upload (RLS per org/project) with metadata (mime, size, owner, project).
* **5.2.b** Display file list on the Resource detail.
  **Acceptance:** Uploads succeed; access policies enforced.

---

## Phase 6 — Project Settings & Navigation Polish

**Goal:** Final UX nits resolved; settings feel complete.

### 6.1 Navigation & Housekeeping

* **6.1.a** Remove “Back to main app” button.
* **6.1.b** Move Projects list into main nav (if not already present).
* **6.1.c** Replace leftover inline styles in new components with Tailwind classes.
  **Acceptance:** Coherent nav; consistent styling.

### 6.2 Project Settings

* **6.2.a** Confirm Name, Start/End are stable (regression tests).
* **6.2.b** Add Location and “Due soon” thresholds.
* **6.2.c** Verify “Apply license to new project” behavior remains intact.
  **Acceptance:** Settings persist; “due soon” highlights reflect thresholds.

---

## Phase 7 — Admin & White‑Label (content ops)

**Goal:** Admins curate catalog content; white‑label ready.

### 7.1 Content Management

* **7.1.a** Admin UI to create/manage Phases, Milestones, Tasks, Subtasks in the Master Library.
* **7.1.b** Publish/Unpublish templates for end users.
* **7.1.c** Create/manage Resource Library items.
* **7.1.d** Secure via Admin role + RLS.
  **Acceptance:** Admin can safely curate and publish; end‑user catalog reflects published only.

### 7.2 White‑Label

* **7.2.a** Branding hooks (logo, colors, org name) across login, nav, and reports.
  **Acceptance:** Tenant branding applies uniformly; no cross‑org leakage.

---

## Phase 8 — Performance & DX (post‑1.0 nice‑to‑have)

**Goal:** Scale UX for large orgs; improve developer experience.

### 8.1 Feature Flags & Envs (from legacy Roadmap)

* **8.1.a** Gate new search & notifications behind flags.
* **8.1.b** Provision Supabase **staging** and Vercel **Preview** deployments per PR.
* **8.1.c** Automate env injection so previews use staging keys.
  **Acceptance:** Features toggled safely; PR previews reflect staging data.

### 8.2 Rendering Performance

* **8.2.a** Memoize heavy components; verify `tasks.length` deps.
* **8.2.b** Virtualize long lists (tasks, search results).
* **8.2.c** Code‑split heavy routes.
  **Acceptance:** Smooth scroll; smaller bundles; improved interaction timings.

### 8.3 Testing Uplift

* **8.3.a** Unit: `taskService`, date computations, search adapter.
* **8.3.b** Integration: TaskContext (instantiation, updates, subscriptions).
* **8.3.c** E2E smoke: create project from template → add/edit/delete tasks → report renders.
  **Acceptance:** CI green; coverage on core flows.

---

## Phase 9 — Post‑Launch Enhancements (backlog)

**Goal:** Value‑add not required for 1.0.

* **9.1** Notifications (weekly priorities, overdue, comments) — behind feature flag.
* **9.2** Account management (change email/password).
* **9.3** Calendar integration (iCal export per project).
* **9.4** Multi‑language scaffolding.
* **9.5** Checkpoint mode (phase‑gated progression UI).
* **9.6** Gantt‑style phase/milestone report.
* **9.7** Admin analytics dashboard.
* **9.8** CRM integrations (e.g., Zoho).
  **Acceptance:** Measurable adoption per feature flag; privacy and RLS preserved.

---

## Phase 10 — Platform Refactors (from legacy Roadmap)

**Goal:** Consolidate core architecture from pre‑refactor roadmap in small, isolated PRs.

### 10.1 `permissionService`

* **10.1.a** Define API; move scattered permission checks into the service.
* **10.1.b** Replace direct checks across components; add unit tests.
  **Acceptance:** Single surface for permissions; 100% checks routed via service.

### 10.2 Task Update Consolidation

* **10.2.a** Implement `updateTaskPositions(updates[])` with typed `updates[]`.
* **10.2.b** Remove legacy update helpers; migrate callers.
  **Acceptance:** One entry point updates ordering across the app.

### 10.3 `dateService`

* **10.3.a** Wrap `DateCacheEngine` + `dateUtils` into a single module.
* **10.3.b** Replace ad‑hoc imports throughout the app.
  **Acceptance:** All date ops flow through `dateService` with tests for DST/zone edges.

### 10.4 Context Split

* **10.4.a** Extract `TasksContext`, `MemberProjectsContext`, `DragDropContext`.
* **10.4.b** Update provider composition and consumer imports.
  **Acceptance:** Smaller, focused contexts; easier testability.

---

## Branch Map (suggested)

* `fix/lint-hygiene` · `fix/abortable-fetch` · `fix/master-library-data` · `fix/master-library-ui` · `feat/form-library-pick`
* `feat/search-highlight` · `fix/template-task-crud` · `feat/date-engine-mvp` · `feat/roles-rls` · `feat/realtime-sync`
* `feat/reports-filters` · `feat/reports-visualization` · `feat/resources-crud` · `feat/resource-upload`
* `chore/nav-polish` · `feat/project-settings` · `feat/admin-catalog` · `feat/white-label`
* `chore/feature-flags` · `chore/staging-vercel-preview` · `perf/virtualize-lists` · `perf/memoize-selectors` · `perf/code-split`
* `refactor/permission-service` · `refactor/task-update-consolidation` · `refactor/date-service` · `refactor/context-split`

---

## PR Template (per sub‑section)

**Plan:** what/why of `x.y.z`
**Commands:** `npm ci && npm run lint && npm run test && npm run build`
**Risk & Rollback:** 1‑commit rollback via `git revert <sha>`
**Acceptance:** specific to `x.y.z` (copied from above)
**Checksum:** `files_changed=<n> | tests_run=<n> pass=<n> | lint_errors=0 | build=pass`

---

## Delivery Milestones

* **v1.0 RC**: Phases **0–4** complete.
* **v1.0 GA**: Phases **0–6** complete (+ critical Admin from **7.1**).
* **v1.1+**: **7.2**, **8.x**, selective **9.x** by client priority.

---

## Quick Comparison Notes (legacy vs vNext)

* vNext’s **Phase 0–2** map to legacy **Phases 1–4** but with clearer acceptance tests and abortable fetch.
* Legacy **Refactor & Consolidate** items are preserved under **Phase 10** to keep current vNext flow unblocked while still driving the architectural cleanup.
* Legacy **DX/Perf** (feature flags, staging, preview, virtualization) are folded into **Phase 8** alongside vNext’s testing uplift.
