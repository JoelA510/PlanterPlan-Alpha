# PlanterPlan — vNext Roadmap (Redlined vs. `refactor`)

**Legend**

* ~~Strikethrough~~ **[Done]** — merged on `refactor`
* **[Partial]** — some work merged, more to do
* **[Planned]** — not started / still to ship

**Recent refs**: (search debounce + abort + trigram indexes; Master Library list + active project filtering; title+description search fix; search tests); chores/tests (supabase client test‑safe; logger namespace; CRA hygiene).

---

## Phase 0 — Baseline & CI Green

### 0.1 Lint & Type Hygiene

* **[Partial]** Fix **`no-undef`** / missing hook deps across `Reports`, `TaskList`, `TaskForm` (several warnings addressed; continue sweeping).
* **[Partial]** Replace faux links with `<button>` or valid `<a href>` (some components done).
* **[Partial]** Remove unused vars surfaced by ESLint (ongoing).
* **[Planned]** Ensure default `switch` cases everywhere.
* **[Partial]** Centralize ESLint config at root; CI runs `lint` + `build` (running green; keep enforcing).

### 0.2 Abortable Fetch Standard

* ~~Adopt `AbortController` in search adapters & Master Library loader~~ **[Done]** (PRs #10, #11).
* **[Partial]** Propagate `.abortSignal(signal)` to *all* list/fetch hooks; add shared `createAbortable()` helper + tests.

---

## Phase 1 — Search & Library UX

### 1.1 Master Library Data Access

* ~~`taskService.fetchMasterLibraryTasks({ from, limit, signal })` (paged, cancellable)~~ **[Done]**.
* ~~Add/verify indexes for pagination & search (incl. trigram)~~ **[Done]** (PR #8).

### 1.2 MasterLibraryList UI

* ~~Tailwind styling; loading / empty / error states~~ **[Done]**.
* ~~Pager Prev/Next with disabled logic~~ **[Done]**.
* **[Partial]** ARIA labels coverage audit (add where missing).

### 1.3 Library Search in Forms

* **[Planned]** Embed Master Library picker inside **Project Template** & **Project Task** forms.
* **[Planned]** Inline create‑resource (modal/inline).
* **[Planned]** Keyboard navigation (↑/↓/Enter with `aria-activedescendant`).

### 1.4 Search Consistency

* ~~Search across **title + description**~~ **[Done]** (PR #11).
* ~~Highlight across the same fields; regression tests for description‑only hits~~ **[Done]** (PR #12).

---

## Phase 2 — Template Task CRUD & Date Engine (MVP)

### 2.1 Template Task CRUD

* **[Planned]** Add/Edit/Delete with list refresh (no optimistic updates yet).
* **[Planned]** Normalize IDs; eliminate delete loops (effect deps).
* **[Planned]** Add **notes** + **days_from_start** columns (migration) & wire up forms.

### 2.2 Date Engine (Minimum Viable)

* **[Planned]** Instantiate project dates from **start + offset**.
* **[Planned]** Parent start/end derive from children; recompute affected ancestors on add/remove/reorder.
* **[Planned]** Manual edits don’t cascade to children by default.
* (**Backlog**) Duration model.

### 2.3 Tests

* **[Planned]** Unit: offset→date mapping; inheritance rules.
* **[Planned]** Integration: template→project instantiation; refresh; delete flows.

---

## Phase 3 — Team Management (roles enforced)

### 3.1 Roles & Permissions

* **[Planned]** Roles: Owner / Full / Limited / Coach (constants + RLS).
* **[Planned]** Client‑side gates + role badges; membership‑based visibility.

### 3.2 Real‑Time Consistency

* **[Planned]** Supabase channels; TaskContext cache updates + dedupe.

### 3.3 Permission Service (platform)

* **[Planned]** Central `permissionService`; refactor existing checks; tests.

---

## Phase 4 — Project Status Reports

### 4.1 Filters & Data

* **[Planned]** Month selector; Completed in month / Overdue EOM / Due next month; exclude archived projects.

### 4.2 Visualization & A11y

* **[Planned]** Progress donut + legend; semantic headings; contrast.

---

## Phase 5 — Resource Library

### 5.1 Resource CRUD & Linking

* **[Planned]** Add/Edit/Delete/list/detail; searchable attach in forms; inline create if missing.

### 5.2 File Upload (Optional)

* **[Planned]** Secure uploads (RLS per org/project) with metadata; list in resource detail.

---

## Phase 6 — Project Settings & Navigation Polish

### 6.1 Navigation & Housekeeping

* **[Planned]** Remove “Back to main app” button; move Projects list into main nav; remove inline styles.

### 6.2 Project Settings

* **[Planned]** Add Location + “Due soon” thresholds; verify license propagation.

---

## Phase 7 — Admin & White‑Label

### 7.1 Content Management

* **[Planned]** Admin UI to curate Master Library (phases/milestones/tasks/subtasks) + publish/unpublish; manage resources; RLS secured.

### 7.2 White‑Label

* **[Planned]** Branding hooks (logo, colors, org name) across login/nav/reports.

---

## Phase 8 — Performance & DX

### 8.1 Feature Flags & Envs

* **[Planned]** Gate features; Supabase **staging** + Vercel **Preview** per PR; auto env injection.

### 8.2 Rendering Performance

* **[Planned]** Memoize heavy components; **virtualize** long lists; **code‑split** heavy routes.

### 8.3 Testing Uplift

* **[Partial]** Supabase client **test‑safe** groundwork landed; extend to larger suite.
* **[Planned]** Unit: `taskService`, date computations, search adapter.
* **[Planned]** Integration: TaskContext (instantiation/updates/subscriptions).
* **[Planned]** E2E smoke: template→project→add/edit/delete→report.

---

## Phase 9 — Post‑Launch Enhancements (Backlog)

* **[Planned]** Notifications; Account management; Calendar (iCal); i18n; Checkpoint mode; Gantt; Analytics; CRM (e.g., Zoho).

---

## Phase 10 — Platform Refactors (from legacy Roadmap)

### 10.1 `permissionService`

* **[Planned]** Define API; funnel all checks; tests.

### 10.2 Task Update Consolidation

* **[Planned]** Single `updateTaskPositions(updates[])`; migrate callers.

### 10.3 `dateService`

* **[Planned]** Wrap `DateCacheEngine` + `dateUtils` into one module; replace ad‑hoc imports; tests for DST/zone edges.

### 10.4 Context Split

* **[Planned]** Extract `TasksContext`, `MemberProjectsContext`, `DragDropContext`; re‑compose providers.

---

## At‑a‑Glance Summary

* ✅ **Shipped**: Master Library list + active project filtering; debounced + abortable search; trigram search indexes; title+description search scope + tests.
* 🟡 **In motion**: Lint hygiene, abortable fetch standardization across all hooks, ARIA polish.
* ⏭️ **Next good PRs**: 1.3 (forms‑integrated library picker), 2.1 (template CRUD), 2.2 (date engine MVP).
