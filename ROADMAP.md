# PlanterPlan — Post-Refactor Product Roadmap (vNext)

> Scope: This roadmap reflects the **current repo state** (post-refactor) and recent PRs (#8–#13), including the Master Library, archived-project filtering, debounced search, `AbortController` adoption, and the search regression fix (title+description). It’s structured so any dev (or Codex/Clause) can execute phase by phase without ambiguity.

---

## Phase 0 — Baseline & CI Green (stabilize main)

**Goal:** Zero failing CI, eliminate obvious lint pitfalls, and lock the post-refactor baseline.

### 0.1 Lint & Type Hygiene

* Fix all **`no-undef`** and **missing dependency** warnings flagged in CI:

  * `TaskContext`: remove/replace `filterOutOrphans`; use the existing, tested helper (e.g., `filterOutLeafTasks`) or implement `filterOutOrphans` locally with tests.
  * Add missing deps on `useMemo`/`useCallback` across `Reports`, `TaskList`, `TaskForm` hooks. Prefer stable helpers or inline functions captured with `useCallback`.
  * Resolve `anchor-is-valid` by converting faux-links to `<button>` or providing valid `href`.
  * Remove unused vars surfaced by ESLint across components/services (e.g., `navigate`, `user`, etc.).
* Ensure **default switch cases** where required.
* Confirm ESLint config is applied uniformly (root‐level `.eslintrc.*`) and CI runs `npm run lint` + `npm run build`.

**Acceptance:** CI “lint” and “build” jobs pass; warnings minimized (or explicitly justified + disabled with inline comments).

---

## Phase 1 — Search & Library UX (polish what exists)

**Goal:** Finish the Master Library & Search experience so it’s performant, cancellable, accurate, and consistent.

### 1.1 Master Library Data Access

* `taskService.fetchMasterLibraryTasks({ from, limit, signal })`:

  * Ensure support for **`AbortController`** via Supabase `.abortSignal(signal)`.
  * Add guardrails (shape validation, empty arrays on error, throw on fatal).
* Indexing: verify Supabase indices on `view_master_library` for pagination fields (id/created_at).

**Acceptance:** Requests are cancellable; paged; no state updates after unmount; console free of fetch race errors.

### 1.2 MasterLibraryList UI

* Keep the **Tailwind-based** version (avoid inline styles).
* Confirm **loading**, **empty**, and **error** states.
* Add pager **Prev/Next** with disabled logic derived from `isLoading` and `tasks.length < limit`.
* If not present, add **aria labels** on buttons and headings.

**Acceptance:** Smooth pagination, correct disabled states, consistent styling, and accessible controls.

### 1.3 Master Library Search & Form Integration

* Move **Library Search** into the **Task forms** (Project Template + Project Task):

  * Provide a “Search & pick from Master Library” slot in the form; selecting an item copies its fields into the draft.
  * If not found, allow “Create new resource from Resource Library” in-place (modal or inline).
* Debounce via **`useDebounce`** or `useEffect` with a 250–400ms window.
* Ensure keyboard navigation in search list (↑/↓/Enter, aria-activedescendant).

**Acceptance:** Users can add tasks from Master Library without leaving the form; search feels instantaneous; keyboard-friendly.

### 1.4 Search Consistency (Regression fixed)

* **Keep** the fix that searches **title + description** (no longer title-only).
* Ensure result highlighting logic matches the same fields.
* Add test(s): a task with the keyword only in `description` should be returned & highlighted.

**Acceptance:** Search returns and highlights results based on both title and description.

---

## Phase 2 — Template Task CRUD & Date Engine (MVP complete)

**Goal:** Fully functional Template Task CRUD with the minimal, correct date propagation.

### 2.1 Template Task CRUD

* **Add/Edit/Delete** of Template Tasks:

  * Fix stale-list issues (refresh after mutation).
  * Resolve reported bugs: “Task not found” (ensure consistent IDs, optimistic update off for now), and any “infinite loop” in delete flows (verify effect deps).
* Add the **“notes”** and **“days from start”** fields end-to-end:

  * DB migration: columns on template tasks.
  * Form fields, validation, and mapping to Supabase.
  * Persist on create/update, display on read.

**Acceptance:** Template tasks can be created, edited, removed; notes & offsets persist; no loops or stale data.

### 2.2 Date Engine (Minimum Viable)

* On **project instantiation from template**, compute task dates from **project start** + **days from start**.
* Maintain **phase/milestone inheritance** (start=min child start; end=max child end).
* On **add/remove/reorder** tasks within a project, recompute affected ancestors only.
* On **manual date edits**, recompute parents (do not mutate children unless explicitly requested).
* Explicitly **do not** implement complex duration models yet; track a backlog item for “duration vs. offset.”

**Acceptance:** Dates are correct for new projects & hierarchy changes; manual edits persist; no global recompute storms.

---

## Phase 3 — Team Management (roles enforced)

**Goal:** Roles exist and are enforced server-side (RLS/policies) with UI affordances.

### 3.1 Roles & Permissions

* Roles: **Owner**, **Full User**, **Limited User**, **Coach**.
* Enforce via **RLS/Policies** and client-side gates:

  * Owner: all project changes; manage settings, invites.
  * Full: edit any task within project.
  * Limited: view all; edit only assigned tasks.
  * Coach: view all; edit only coaching-type tasks.
* Ensure “joined but don’t own” projects show in the UI (already present; verify via membership join).

**Acceptance:** Authorized operations succeed, unauthorized fail gracefully; invites add membership rows; UI shows role badges.

### 3.2 Real-Time Consistency

* When invited users make changes (complete/edit tasks), owners see updates:

  * Use Supabase **channel/changes** subscriptions on task tables scoped by project.
  * Update TaskContext caches accordingly with proper deduping.

**Acceptance:** Owner and member views stay in sync without manual refresh.

---

## Phase 4 — Project Status Reports (functional reporting)

**Goal:** Useful, filterable project reporting for month-end status.

### 4.1 Filters & Data

* **Month Selector** to pick the reporting month (default: previous month).
* Derived sets:

  * **Completed in month**
  * **Overdue as of month end**
  * **Due next month**
* Data comes from instance tasks only; excludes archived projects.

**Acceptance:** Selecting a month correctly recomputes the three lists.

### 4.2 Visualization & A11y

* **Progress Donut** (projects completion %):

  * Calculate from task completion ratio (optionally weight phases ≥ milestones ≥ tasks later).
  * Add legend with counts.
* Ensure semantic headings, list semantics, and colors have sufficient contrast.

**Acceptance:** Chart renders with legend; keyboard/screen-reader friendly.

---

## Phase 5 — Resource Library (complete the loop)

**Goal:** Resources are first-class and usable from Master Library and tasks.

### 5.1 Resource CRUD & Linking

* Confirm Resource Library page supports **Add/Edit/Delete**, list, and detail view.
* In Task forms and Master Library forms:

  * **Attach existing resource** via searchable picker.
  * **Create new resource** inline when needed.
* Optional: “drop-box” style upload (phase 5.2).

**Acceptance:** Users can attach or create a resource during task creation/edit; links render consistently.

### 5.2 File Upload (Optional within Phase)

* Introduce upload for documents (policies/RLS to restrict per org/project).
* Store metadata (mime, size, owner, project).

**Acceptance:** Uploads succeed; files list under a resource; access policies enforced.

---

## Phase 6 — Project Settings & Navigation Polish

**Goal:** Final UX nits resolved; settings feel complete.

### 6.1 Navigation & Housekeeping

* Remove **“Back to main app”** button.
* Move **Projects list** into the main nav (if not already).
* Clean up any leftover inline styles in new components; centralize design via Tailwind classes.

**Acceptance:** Nav is coherent; styling consistent across modules.

### 6.2 Project Settings

* Ensure **Name**, **Start/End dates** are stable (done).
* Add **Location** and basic “Due soon” parameters (thresholds for highlighting).
* Apply **license to new project** setting is respected (already present; verify behavior).

**Acceptance:** Settings saved/persisted; “due soon” highlights reflect thresholds.

---

## Phase 7 — Admin & White-Label (content operations)

**Goal:** Admin can manage catalog content; white-label is ready for clients.

### 7.1 Content Management

* Admin UI for:

  * Create/manage **Phases, Milestones, Tasks, Subtasks** in the **Master Library**.
  * **Publish/Unpublish** templates for end-users.
  * Create/manage **Resource Library Items**.
* Enforce via Admin role + RLS.

**Acceptance:** Admin can curate and publish content safely; end-user catalog reflects published sets only.

### 7.2 White-Label

* Confirm branding hooks (logo, colors, org name) are applied consistently across login, nav, and reports.

**Acceptance:** Tenant branding applies uniformly; no leakage across orgs.

---

## Phase 8 — Performance & DX (nice-to-have after 1.0)

**Goal:** Scale UX for large orgs; boost developer experience.

### 8.1 Perf

* **Virtualize** long lists (tasks, search results).
* **Code-split** heavy routes.
* Memoize expensive selectors in TaskContext (ensure stable inputs).
* Client-side caching layer (stale-while-revalidate for read-heavy lists).

**Acceptance:** Smooth scroll in large lists; reduced bundle size and layout jank.

### 8.2 Testing

* Unit tests: `taskService`, date computations, search adapter.
* Integration: TaskContext (instantiation, updates, subscriptions).
* E2E smoke: Create project from template → add/edit/delete tasks → report renders.

**Acceptance:** CI runs tests; green baseline; coverage on core flows.

---

## Phase 9 — Post-Launch Enhancements (backlog)

**Goal:** Value-add features prioritized by client impact (not required for 1.0).

* **Notifications** (weekly priorities, overdue, comments).
* **Account Management** (change email/password).
* **Calendar integration** (iCal export per project).
* **Multi-language** scaffolding.
* **Checkpoint mode** (phase-gated progression UI).
* **Gantt (phases/milestones)** report.
* **Analytics** (admin dashboard).
* **Zoho** or other CRM integrations.

**Acceptance:** Each shipped behind a feature flag; measurable adoption.

---

## Non-Goals / Explicitly Deferred

* Complex duration engine (beyond “days from start”) — backlog for a later milestone.
* Over-eager automatic date cascades from manual edits (keep edits local unless explicitly requested).
* Any cross-org data visibility.

---

## Delivery Milestones

* **v1.0 RC**: Phases 0–4 complete.
* **v1.0 GA**: Phases 0–6 complete (+ critical Admin items from 7.1).
* **v1.1+**: 7.2, 8.x, selective 9.x by client priority.

---

## Notes Tied to Recent PRs (for continuity)

* **PR #8–#10:** Master Library feature + archived filters + debounced search → **Keep and refine** per Phase 1.
* **PR #11:** `AbortController` adoption → **Standardize** in all list/fetch hooks.
* **PR #12:** Fix search scope regression → **Lock** behavior to title **and** description; add tests.
* **PR #13:** TaskContext property mapping cleanup → **Ensure** no undefined helpers (e.g., `filterOutOrphans`) remain.

---

### Success Criteria (Executive Summary)

* CI is green; repo is lint-clean where practical.
* Master Library and Search are **fast, accurate, cancellable**.
* Template Tasks are fully **CRUD-capable** with **notes** and **days from start**; projects instantiate with correct dates.
* **Roles** enforced; **reports** useful; **resources** usable from forms.
* UI is **consistent** (Tailwind), **accessible**, and **performant** for large datasets.