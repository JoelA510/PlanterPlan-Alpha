# Engineering Knowledge Base

**Purpose**: This living document captures hard-won lessons, architectural decisions, and recurrent pitfalls.
**Usage**: Check this files before estimating complex tasks or refactoring core services.

---

## [DB-001] RLS Recursion & The `root_id` Optimization

**Tags**: #database, #rls, #performance, #infinite-loop
**Date**: 2025-12-15

### Context & Problem
We initially defined a Row Level Security (RLS) policy that allowed users to view tasks if they were a member of the project (root task).
The policy looked up the task's `parent_task_id` recursively to find the root.
**Result**: Postgres infinite recursion error (`infinite recursion detected in policy for relation "tasks"`). Database crashed on simple SELECTs.

### Solution & Pattern
We introduced a denormalized `root_id` column on the `tasks` table.
1.  **Schema Change**: Added `root_id` UUID column.
2.  **Trigger**: A `BEFORE INSERT/UPDATE` trigger (`maintain_task_root_id`) automatically enforces that every child task inherits its parent's `root_id`.
3.  **Policy Simplification**: RLS now simply checks `root_id IN (SELECT project_id FROM project_members...)`. Zero recursion.

### Critical Rule
> **Never** write recursive RLS policies. Always denormalize the hierarchy identifier (e.g., `project_id` or `root_id`) to the row itself.

---

## [SVC-002] Deep Clone "Race Condition" vs. Integrity

**Tags**: #service, #recursion, #race-condition
**Date**: 2025-12-15

### Context & Problem
The "Deep Clone" feature (creating a project from a template) was failing intermittently or creating orphaned records.
We were attempting to insert tasks in parallel (`Promise.all`) to speed it up.
**Result**: Child tasks were sometimes inserted before their Parents existed, causing Foreign Key constraint violations (`parent_task_id` not found).

### Solution & Pattern
1.  **Topological Sort**: We switched to a strictly sequential insertion order: Roots first, then Level 1, then Level 2.
2.  **ID Mapping**: We generate **new UUIDs in memory** for the entire tree _before_ insertion. This allows us to construct the full dependency graph with valid FKs without needing to wait for DB round-trips to return IDs.

### Critical Rule
> When cloning hierarchies, **pre-generate IDs** on the client/service side. Do not rely on valid DB auto-generation if you need to insert children in the same batch.

---

## [UI-003] User-Scoped Drag and Drop (The "Guest" Bug)

**Tags**: #dnd, #optimistic-ui, #security
**Date**: 2025-12-16

### Context & Problem
Users could drag tasks, but sometimes the drop would seemingly "succeed" in UI but revert on refresh, or worse, persist incorrect data.
The issue was that `renormalizePositions` (fixing gaps in 10, 20, 30...) was fetching *all* tasks globally, not just the user's view.
**Result**: A user reordering their list could accidentally shift positions of tasks in *other users'* private projects if IDs collided or filters were loose.

### Solution & Pattern
1.  **Scope by Context**: All position calculations must explicitly include `owner_id` or `project_id` filters.
2.  **Optimistic Rollback**: We implemented a `try/catch` in `handleDragEnd`. If the API call fails, we force a `fetchTasks()` to snap the UI back to reality immediately.

### Critical Rule
> **Positioning logic is not global.** Always scope reordering logic to the specific container (Project/User) to avoid corrupting shared state.

---

## [FE-004] Date Recalculation Loops

**Tags**: #dates, #react, #infinite-loop
**Date**: 2025-12-15

### Context & Problem
Updating a parent task's start date triggered a recalculation of children's dates.
The child update trigger noticed the parent changed, which triggered the parent update...
**Result**: React `Maximum update depth exceeded`.

### Solution & Pattern
1.  **Directional Updates Only**:
    *   **Downstream**: Parent moves -> shift children by delta.
    *   **Upstream**: Child expands range -> extend parent (min/max).
2.  **Atomic Commits**: Calculate all required date changes in memory first, then perform a single bulk `update` (or batched updates) rather than chaining `useEffect` dependent calls.

### Critical Rule
> **Avoid "Reflexive" Date Logic.** Explicitly separate "Push" (Parent->Child) vs "Pull" (Child->Parent) events. Never handle both in the same generic `useEffect`.

---

## [FE-005] Recursive Component Performance

**Tags**: #react, #recursion, #performance
**Date**: 2025-12-16

### Context & Problem
Rendering a deeply nested task tree (5+ levels) caused significant UI lag during drag operations.
React was re-rendering the entire tree whenever a single node state changed (e.g., expand/collapse).

### Solution & Pattern
We used a strict **recursive component pattern** (`TaskItem` renders `TaskItem`) but ensured that `dnd-kit` contexts (`SortableContext`) are isolated per parent.
*   **Key**: `TaskItem` memoization (via `React.memo` or careful prop passing) prevents unrelated branches from re-rendering.
*   **Structure**: Each level defines its own `droppable` zone (`useDroppable` in `TaskItem`), rather than one giant global drop zone.

### Critical Rule
> For deep trees, **isolate drop zones**. Do not create a single flat sortable list if the data is hierarchical; let each parent manage its own children's sorting context.

---

## [SVC-006] Cancellable Search Requests (AbortController)

**Tags**: #service, #api, #race-condition
**Date**: 2025-12-16

### Context & Problem
In the "Master Library Search" type-ahead, fast typing triggered multiple API requests.
Often, the results of an *older* request (e.g., query "Test") would arrive *after* the newer request (query "Testing"), overwriting the UI with stale data.

### Solution & Pattern
We implemented `AbortController` in `taskService.js`.
1.  **Signal**: The service accepts `{ signal }` in its arguments.
2.  **Cleanup**: The `useEffect` in the UI calls `controller.abort()` on unmount or before the next request.
3.  **DB Layer**: We pass `.abortSignal(signal)` to the Supabase client builder.

### Critical Rule
> **Always abort stale read requests.** Any "searches as you type" feature must implement request cancellation/debouncing to guarantee the UI reflects the latest input.

---

## [DB-007] Trigger Idempotency & Recursion Guard

**Tags**: #database, #triggers, #stability
**Date**: 2025-12-16

### Context & Problem
The `maintain_task_root_id` trigger fetches the parent's `root_id`.
If we performed a bulk update, the trigger fired for every row, sometimes re-calculating `root_id` even if it was functionally unchanged.
Worse, on `INSERT`, if we provided a `root_id` (from our memory-generated ID map), the trigger would ignore it and re-fetch, wasting cycles.

### Solution & Pattern
1.  **Trust User Input on ID generation**: `IF TG_OP = 'INSERT' AND NEW.root_id IS NOT NULL THEN RETURN NEW;`. Check if we already did the work.
2.  **Update Guard**: Only recalculate if `parent_task_id` actually *changed* (`OR UPDATE OF parent_task_id`).

### Critical Rule
> **Triggers should be lazy.** Optimization triggers must exit early if their target column is already correct or if the determining column hasn't changed.

---

## [DB-008] Ambiguous Column References in Seeds

**Tags**: #database, #sql, #seeds
**Date**: 2025-12-06

### Context & Problem
Running `sample_seed_data.sql` failed with "ambiguous column reference: id".
The script used an `INSERT INTO ... SELECT ...` statement involving a JOIN where both tables had an `id` column, and the select list didn't specify which table's `id` to use.

### Solution & Pattern
Explicitly alias tables and qualify all column references.
*   **Before**: `SELECT id, title FROM projects JOIN users ...`
*   **After**: `SELECT p.id, p.title FROM projects p JOIN users u ...`

### Critical Rule
> **Always alias tables in JOINs.** Never rely on implicit resolution in seed scripts or complex queries, especially for common columns like `id` or `created_at`.

---

## [CSS-009] Flexbox Defaults (Row vs Column)

**Tags**: #css, #ui, #flexbox
**Date**: 2025-12-03

### Context & Problem
Master Library task items displayed title and description side-by-side (row) instead of stacked (column), breaking the layout on smaller screens.
This happened because `flex` defaults to `flex-row` if not specified, or a parent container was enforcing row direction.

### Solution & Pattern
Explicitly defined flex direction in Tailwind classes.
*   Added `flex-col` to the text container wrapper.
*   Ensured specific widths (`w-full` or `flex-1`) were applied to children to force them to consume available space if needed.

### Critical Rule
> **Explicitly state Flex Direction.** Don't rely on `div` block behavior inside a flex container; added `flex-col` to ensure vertical stacking is preserved.

---

## [ENV-010] Local Dev Port Selection

**Tags**: #env, #config, #startup
**Date**: 2025-12-16

### Context & Problem
Application failed to startup or connected to the wrong backend because `npm start` (React scripts) attempted to pick a random port when 3000 was busy, but the Supabase client was hardcoded to expect CORS from localhost:3000.

### Solution & Pattern
1.  **Strict Port**: We verified the startup log to ensure it was actually on 3000.
2.  **Kill Scripts**: Used `npx kill-port 3000` to free up the port before starting, ensuring environmental consistency.

### Critical Rule
> **Enforce the Port.** If your auth/CORS config relies on a specific port (e.g., 3000), do not let your dev server auto-switch. Fail fast or kill the blocking process.

---

## [FE-011] UTC Midnight Normalization

**Tags**: #dates, #utilities, #timezone
**Date**: 2025-12-16

### Context & Problem
Tasks with "start dates" were shifting by one day when viewed in different time zones (e.g., a US user sets a date, an Asia user sees it as "yesterday").
JS `Date` objects default to local time, causing drift when serialized to ISO strings.

### Solution & Pattern
In `dateUtils.js`, we enforce a hard UTC normalization layer.
*   **Input**: Any date string.
*   **Process**: Append `T00:00:00.000Z` if missing, then explicitly `setUTCHours(0,0,0,0)`.
*   **Output**: Always a simplified ISO string at midnight UTC.

### Critical Rule
> **Dates are Data, not Points in Time.** For project schedules (dates without times), always normalize to UTC midnight immediately upon input handling to prevent timezone drift.

---

## [DX-012] Zero-Tolerance Linting

**Tags**: #dx, #quality, #ci
**Date**: 2025-12-16

### Context & Problem
Small warnings (unused variables, missing dependency in `useEffect`) were accumulating in the console, hiding real errors and risking React staleness bugs.
Developers were ignoring warnings because "the app still runs".

### Solution & Pattern
We updated `package.json` to enforce strictness in the `lint` command:
`"lint": "eslint \"src/**/*.{js,jsx}\" --max-warnings=0"`
This causes any warning to fail the build/commit hook, forcing immediate resolution.

### Critical Rule
> **Warnings are Errors.** In a complex codebase (especially with React Hooks), treat lint warnings as blocking errors. Zero tolerance prevents technical debt rot.
