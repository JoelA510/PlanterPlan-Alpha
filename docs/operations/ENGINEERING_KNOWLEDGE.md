<!-- markdownlint-disable MD024 -->

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

1. **Schema Change**: Added `root_id` UUID column.
2. **Trigger**: A `BEFORE INSERT/UPDATE` trigger (`maintain_task_root_id`) automatically enforces that every child task inherits its parent's `root_id`.
3. **Policy Simplification**: RLS now simply checks `root_id IN (SELECT project_id FROM project_members...)`. Zero recursion.

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

1. **Topological Sort**: We switched to a strictly sequential insertion order: Roots first, then Level 1, then Level 2.
2. **ID Mapping**: We generate **new UUIDs in memory** for the entire tree _before_ insertion. This allows us to construct the full dependency graph with valid FKs without needing to wait for DB round-trips to return IDs.

### Critical Rule

> When cloning hierarchies, **pre-generate IDs** on the client/service side. Do not rely on valid DB auto-generation if you need to insert children in the same batch.

---

## [UI-003] User-Scoped Drag and Drop (The "Guest" Bug)

**Tags**: #dnd, #optimistic-ui, #security
**Date**: 2025-12-16

### Context & Problem

Users could drag tasks, but sometimes the drop would seemingly "succeed" in UI but revert on refresh, or worse, persist incorrect data.
The issue was that `renormalizePositions` (fixing gaps in 10, 20, 30...) was fetching _all_ tasks globally, not just the user's view.
**Result**: A user reordering their list could accidentally shift positions of tasks in _other users'_ private projects if IDs collided or filters were loose.

### Solution & Pattern

1. **Scope by Context**: All position calculations must explicitly include `owner_id` or `project_id` filters.
2. **Optimistic Rollback**: We implemented a `try/catch` in `handleDragEnd`. If the API call fails, we force a `fetchTasks()` to snap the UI back to reality immediately.

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

1. **Directional Updates Only**:
   - **Downstream**: Parent moves -> shift children by delta.
   - **Upstream**: Child expands range -> extend parent (min/max).
2. **Atomic Commits**: Calculate all required date changes in memory first, then perform a single bulk `update` (or batched updates) rather than chaining `useEffect` dependent calls.

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

- **Key**: `TaskItem` memoization (via `React.memo` or careful prop passing) prevents unrelated branches from re-rendering.
- **Structure**: Each level defines its own `droppable` zone (`useDroppable` in `TaskItem`), rather than one giant global drop zone.

### Critical Rule

> For deep trees, **isolate drop zones**. Do not create a single flat sortable list if the data is hierarchical; let each parent manage its own children's sorting context.

---

## [SVC-006] Cancellable Search Requests (AbortController)

**Tags**: #service, #api, #race-condition
**Date**: 2025-12-16

### Context & Problem

In the "Master Library Search" type-ahead, fast typing triggered multiple API requests.
Often, the results of an _older_ request (e.g., query "Test") would arrive _after_ the newer request (query "Testing"), overwriting the UI with stale data.

### Solution & Pattern

We implemented `AbortController` in `taskService.js`.

1. **Signal**: The service accepts `{ signal }` in its arguments.
2. **Cleanup**: The `useEffect` in the UI calls `controller.abort()` on unmount or before the next request.
3. **DB Layer**: We pass `.abortSignal(signal)` to the Supabase client builder.

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

1. **Trust User Input on ID generation**: `IF TG_OP = 'INSERT' AND NEW.root_id IS NOT NULL THEN RETURN NEW;`. Check if we already did the work.
2. **Update Guard**: Only recalculate if `parent_task_id` actually _changed_ (`OR UPDATE OF parent_task_id`).

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

- **Before**: `SELECT id, title FROM projects JOIN users ...`
- **After**: `SELECT p.id, p.title FROM projects p JOIN users u ...`

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

- **Added `flex-col`** to the text container wrapper.
- Ensured specific widths (`w-full` or `flex-1`) were applied to children to force them to consume available space if needed.

### Critical Rule

> **Explicitly state Flex Direction.** Don't rely on `div` block behavior inside a flex container; added `flex-col` to ensure vertical stacking is preserved.

---

## [ENV-010] Local Dev Port Selection

**Tags**: #env, #config, #startup
**Date**: 2025-12-16

### Context & Problem

Application failed to startup or connected to the wrong backend because `npm start` (React scripts) attempted to pick a random port when 3000 was busy, but the Supabase client was hardcoded to expect CORS from localhost:3000.

### Solution & Pattern

1. **Strict Port**: We verified the startup log to ensure it was actually on 3000.
2. **Kill Scripts**: Used `npx kill-port 3000` to free up the port before starting, ensuring environmental consistency.

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

- **Input**: Any date string.
- **Process**: Append `T00:00:00.000Z` if missing, then explicitly `setUTCHours(0,0,0,0)`.
- **Output**: Always a simplified ISO string at midnight UTC.

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

---

## [ARC-013] Context Provider Hierarchy

**Tags**: #react, #architecture, #bug
**Date**: 2025-04-17

### Context & Problem

Users experienced infinite reload loops or "stale auth" states when refreshing the page.
The issue was caused by incorrect nesting of global context providers.
If `TaskContext` (which fetches data using Org ID) is placed _outside_ `OrganizationProvider` (which supplies Org ID), it initiates fetches with null IDs or causes re-renders when the inner context finally initializes.

### Solution & Pattern

We established a strict hierarchy for the application root:

1. **AuthContext**: Must be top-level to handle user session.
2. **Router**: Needs Auth to decide on redirects (Protected Routes).
3. **OrganizationProvider**: Needs Router params (URL slug) to determine the current organization.
4. **TaskContext**: Needs Organization ID to scope data fetches.

### Critical Rule

> **Respect the Data Dependency Chain.** Never place a data-fetching context higher than the provider that supplies its required IDs/Tokens.

---

## [DB-014] RLS Silent Filtering

**Tags**: #database, #rls, #debugging
**Date**: 2025-03-26

### Context & Problem

Frontend showed "0 Tasks" despite the user being logged in and data existing in the DB.
Console logs showed no errors, just empty arrays.
The root cause was Row Level Security (RLS) silently filtering out the rows because the API query was missing a required scope (e.g., `organization_id`) that the RLS policy checked for.

### Solution & Pattern

1. **Explicit Filtering**: All service calls must now explicitly include `organization_id` (or the relevant scope).
2. **Service Isolation**: We created `organizationService.js` to handle scope resolution separate from the valid business logic.

### Critical Rule

> **RLS is Silent.** If an API returns exactly 0 results and no error, assume your RLS policy is filtering you out due to missing context params (Org ID / User ID) in the query or session.

---

## [DB-015] PL/pgSQL Ambiguous Column References

**Tags**: #database, #plpgsql, #debugging, #ambiguity
**Date**: 2025-12-22

### Context & Problem

A `BEFORE INSERT` trigger (`maintain_task_root_id`) and a helper function (`get_task_root_id`) were both failing with the error:
`column reference "root_id" is ambiguous`.

This happened because the code looked like this:

```sql
DECLARE
  root_id uuid; -- Local variable named 'root_id'
BEGIN
  SELECT t.root_id INTO root_id -- Selecting into variable 'root_id'
  FROM public.tasks t ...
```

Postgres PL/pgSQL couldn't distinguish between the column `root_id` and the local variable `root_id` in the `INTO` clause or subsequent usage, causing the query to fail (or worse, silently behave unexpectedly).

### Solution & Pattern

**Hungarian Notation (or similar prefixing) for variables is MANDATORY** in PL/pgSQL.

1. **Prefix Variables**: Always prefix local variables (e.g., `v_root_id`, `p_task_id`, `r_result`).
2. **Qualify Columns**: Always use the table alias (e.g., `t.root_id`).

**Corrected Code**:

```sql
DECLARE
  v_root_id uuid; -- DISTINCT name
BEGIN
  SELECT t.root_id INTO v_root_id
  ...
```

### Critical Rule

> **Never name a PL/pgSQL variable the same as a table column.** It creates inherent ambiguity. Use `v_` or `p_` prefixes to guarantee distinctness.

---

## [UI-016] Optimistic Rollback Strategy

**Tags**: #ui, #ux, #optimistic-ui, #error-handling
**Date**: 2025-12-23

### Context & Problem

When a user drags a task, we update the UI immediately (optimistic update) for responsiveness.
However, if the backend call (`updateTaskPosition`) failed, the previous behavior was to trigger a full `fetchTasks()`.
**Result**: This caused the entire task list to flicker or reload, creating a jarring user experience compared to the smooth drag interaction.

### Solution & Pattern

We implemented a **Local State Rollback**.

1. **Capture State**: Before applying the optimistic update, capture the current state: `const previousTasks = [...tasks];`.
2. **Try/Catch**: Wrap the API call in a try/catch block.
3. **Rollback**: In the `catch` block, immediately call `setTasks(previousTasks)` to revert the UI to its exact pre-drag state without a network fetch.
4. **Feedback**: Show a user-friendly alert or toast ("Failed to move task. Reverting...") instead of a generic error.

### Critical Rule

> **Snap Back, Don't Reload.** When an optimistic UI action fails, revert the local state synchronously using captured data. Do not rely on a full network refetch to fix the UI unless the state is likely corrupted.

---

## [UI-017] Atomic Design & Elevation System

**Tags**: #ui, #css, #architecture, #atomic-design
**Date**: 2025-12-23

### Context & Problem

The component hierarchy was flat and inconsistent (`components/tasks`, `components/common`), leading to circular dependency risks ("Organisms importing Molecules that import Organisms") and unclear boundaries.
Visually, the app used an eclectic mix of hard-coded colors and inconsistent shadow depths ("Booty Coloration").

### Solution & Pattern

1. **Atomic Design Migration**: We strictly reorganized `src/components` into:
   - `atoms/`: Indivisible UI bits (e.g., `RoleIndicator`, `ErrorFallback`).
   - `molecules/`: Simple groups (e.g., `TaskItem`, `TaskResources`).
   - `organisms/`: Complex logic zones (e.g., `TaskList`, `NewProjectForm`).
   - `templates/`: Page layouts (e.g., `TaskDetailsView`).

2. **Semantic Elevation System**:
   - Replaced ad-hoc shadows with a global CSS variable system in `globals.css` (`--elevation-1`, `--elevation-2`).
   - Implemented standard motion utilities (`.elevation-hover`) for consistent "lift" effects.

### Critical Rule

> **Define Depth Globally.** Do not hardcode box-shadows. Use the shared `--elevation-N` variables to ensure a consistent lighting model across the application.
> **Dependency Direction**: Organisms import Molecules. Molecules import Atoms. **Never the reverse.**

---

## [UI-018] Brand Identity System

**Tags**: #ui, #branding, #css
**Date**: 2025-12-24

### Context & Problem

The application lacked a distinct brand identity, using generic "Developer Blue" colors. The goal was to align with the visual identity of `planterplan.com`.

### Solution & Pattern

1. **Brand Extraction**: We extracted the primary brand colors from `https://planterplan.com/`:
   - **Primary Orange**: `#F1592A` (Used for Actions, Links, Highlights).
   - **Accents**: Charcoal (`#222222`) for text/nav, Light Gray (`#EEEEEE`) for backgrounds.
2. **Global Mapping**: We mapped these to global CSS variables in `globals.css` and updated utility classes (`.bg-blue-500` -> Primary Orange) to propagate the brand instantly across legacy components.

### Critical Rule

> **Use the Variables.** Never hardcode hex values like `#F1592A`. Always use usage-derived variables (e.g., `var(--brand-primary)`) or Tailwind utility aliases (e.g., `bg-brand-primary`) to ensure theming consistency.

---

## [FE-019] Recursive Tree Expansion State

**Tags**: #react, #recursion, #performance, #state-management
**Date**: 2025-12-25

### Context & Problem

Passing a mutable `Set` or `ExpandedIds` array down a recursive component tree (`TaskItem` -> `TaskItem` -> ...) causes "Prop Instability".
Every time the Set changes (reference update), **every** node in the tree re-renders, even if only one small leaf toggled. This destroys the benefits of `React.memo`.

### Solution & Pattern

**Data-Driven State**: Instead of passing external state props, merge the visual state into the data itself.

1. **Merge**: In the parent (`MasterLibraryList`), when `expandedTaskIds` changes, map it to the `treeData` (`task.isExpanded = true`).
2. **Memoize**: Pass the stable `task` object to `TaskItem`. `TaskItem` reads `task.isExpanded`.
3. **Result**: Toggling expands only the specific node and its immediate parent/children, not the entire tree.

### Critical Rule

---

## [RPC-020] Atomic Deep Cloning

**Tags**: #database, #performance, #rpc, #transactions
**Date**: 2025-12-29

### Context & Problem

Client-side deep cloning (fetching a tree, generating IDs, inserting sequentially) was brittle.
Network latency causes "partial" clones if the connection drops.
`Promise.all` logic was complex and prone to race conditions (orphaned children).

### Solution & Pattern

**Move strict transactional logic to the Database (RPC).**

1. **RPC**: `clone_project_template(template_id, owner_id)`.
2. **Transaction**: Postgres functions are atomic by default.
3. **Performance**: Reduces 200+ HTTP round-trips to **1 request**.

### Critical Rule

> **Transactions belong in the DB.** For multi-step write operations where partial success is unacceptable (like cloning trees), use a Postgres Function (RPC) instead of orchestrating it from the client.

---

## [FE-021] Hook Extraction for Complex Components

**Tags**: #react, #hooks, #refactoring
**Date**: 2025-12-29

### Context & Problem

`TaskList.jsx` grew to ~1100 lines (The "God Component").
It mixed **Drag-and-Drop sensors**, **CRUD API calls**, **Optimistic UI logic**, and **Layout**.
This made it impossible to test logic without rendering the full UI.

### Solution & Pattern

**Split by Concern, not just by Component.**

1. **`useTaskDrag`**: Encapsulates `dnd-kit` sensors, effect handling, and rollback state. Exports `{ handleDragEnd }`.
2. **`useTaskOperations`**: Encapsulates `supabase` calls, state (tasks array), and loading states. Exports `{ createTask, updateTask }`.
3. **`TaskList`**: Becomes a "dumb" layout component that wires hooks together.

### Critical Rule

> **Extract Logic to Hooks.** If a component exceeds 500 lines or manages >3 distinct state concerns (e.g., Data, Dragging, Form visibility), extract the logic into custom hooks to verify them independently.

---

## [FE-022] Modal Portals for Stacking Context Isolation

**Tags**: #react, #css, #modals, #z-index
**Date**: 2026-01-03

### Context & Problem

The "Invite Member" modal was rendering at the bottom of the page instead of centered, despite having `position: fixed` and `z-index: 9999`. The modal was a child of a complex layout with CSS `transform` and `overflow: hidden` properties.

**Result**: CSS `position: fixed` breaks when any ancestor has `transform`, `filter`, or `perspective` properties—this creates a new stacking context that traps the "fixed" element.

### Solution & Pattern

1. **React Portal**: Wrap modal content with `ReactDOM.createPortal(content, document.body)` to render it outside the DOM hierarchy entirely.
2. **Inline Styles as Fallback**: When Tailwind classes don't apply correctly due to context, use inline `style={{ position: 'fixed', ... }}` to guarantee behavior.

### Critical Rule

> **Modals must portal to body.** Never render modals inside layout containers with `transform`, `overflow`, or `perspective`. Use `ReactDOM.createPortal` to escape the stacking context.

---

## [SEC-023] Project Membership Initialization

**Tags**: #security, #rls, #edge-functions, #membership
**Date**: 2026-01-03

### Context & Problem

The "Invite by Email" Edge Function returned 403 Forbidden for newly created projects, even when the logged-in user was the project creator.

**Root Cause**: The Edge Function checks `project_members` table for authorization. Project creation only inserted into `tasks` table—the creator was never added to `project_members`. The function's permission check failed because the user had no membership row.

### Solution & Pattern

1. **Return Project ID**: Modified `createProject` in `useTaskOperations.js` to return the newly created project object (added `.select().single()` to the insert).
2. **Auto-Add Member**: In `TaskList.jsx`, immediately call `inviteMember(projectId, userId, 'owner')` after project creation to populate `project_members`.

### Critical Rule

> **Creators must be members.** When an Edge Function or RLS policy checks a membership table for authorization, ensure the creation logic explicitly adds the creator to that table. Do not rely on implicit "owner" status from other columns.

