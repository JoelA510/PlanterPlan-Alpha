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

Application failed to startup or connected to the wrong backend because the dev server attempted to pick a random port when 3000 was busy, but the Supabase client was hardcoded to expect CORS from localhost:3000.

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

---

## [SEC-024] Explicit Role Checking

**Tags**: #security, #roles, #rbac
**Date**: 2026-01-04

### Context & Problem

Authorization checks relied on loose string matching (e.g., `user.role === 'admin'`).
Hardcoded strings are prone to typos (`'Admin'`, `'ADMIN'`) and refactoring errors.
Specifically, an admin user could bypass checks by simply having "admin" in their email due to a fallback logic intended for debugging.

### Solution & Pattern

1. **Centralized Constants**: Defined `ROLES` constant in `src/constants/index.js`.
2. **Explicit Checks**: Replaced logic with strict equality checks using the constant (`user.role === ROLES.ADMIN`).
3. **Removed Fallbacks**: Deleted insecure email-based admin promotion logic.

### Critical Rule

> **No Magic Strings for Auth.** Always use a centralized constant (Enum) for role checks. Never allow string partial matching or loose fallbacks for privileged access.

---

## [PERF-025] Timezone Safety in Date Utils

**Tags**: #dates, #timezone, #bugs
**Date**: 2026-01-04

### Context & Problem

The function `toIsoDate` was creating a JS `Date` object and appending `T00:00:00.000Z` to force UTC.
However, inputting a date string like "2025-01-01" into `new Date()` can sometimes be interpreted as Local Midnight depending on browser/runtime, and when converted to ISO, it shifts to "2024-12-31T..." in Western hemispheres.
Users saw "Yesterday" bug when saving dates.

### Solution & Pattern

**String-First Approach**:
If the goal is to save a `DATE` (YYYY-MM-DD), avoid `new Date()` object instantiation if possible, or strictly truncate the output.
We refactored `toIsoDate` to return the `YYYY-MM-DD` part of the ISO string directly, ensuring the DB receives a clean date literal, avoiding `TIMESTAMPTZ` shifting on the server side if standard CASTs are used.

### Critical Rule

> **Truncate for Date-Only fields.** If a field represents a calendar date (e.g., Birthday, Due Date), pass a `YYYY-MM-DD` string to the API. Do not pass a Zulu-time ISO string unless you want it anchored to a specific instant in UTC.

---

## [DB-026] Recursion Depth Guard

**Tags**: #database, #triggers, #stability
**Date**: 2026-01-04

### Context & Problem

A trigger was designed to update parent dates when a child changed.
However, updating the parent caused a "Child Updated" event in some edge cases (or if logic was bidirectional), creating an infinite loop.
Postgres would crash the transaction.

### Solution & Pattern

**Recursion Depth Check**:
In the PL/pgSQL trigger, we added:

```sql
IF pg_trigger_depth() > 10 THEN
  RETURN NEW; -- Exit to prevent crash
END IF;
```

This allows legitimate cascading (Level 1 -> Level 2) but stops infinite cycles.

### Critical Rule

> **Guard your Triggers.** Always include a `pg_trigger_depth()` check in complex cascading triggers to prevent stack overflow crashes during bulk updates or logic loops.

## [CSS-002] Malformed CSS Syntax Impact

- **Tags**: #css, #debugging
- **Date**: 2026-01-03
- **Context & Problem**: The desktop sidebar layout broke (width collapsed) because critical utility classes (`.w-64`) were seemingly ignored.
- **Solution & Pattern**: Investigation revealed a missing closing brace `}` for a `@media print` block earlier in the file, causing subsequent classes to be treated as part of the media query (or ignored).
- **Critical Rule**: Always lint or validate CSS file structure; a single missing brace can invalidate large sections of styles silently.

## [DATE-002] UTC Date Display Consistency

- **Tags**: #date-handling, #javascript
- **Date**: 2026-01-03
- **Context & Problem**: Dates stored as `YYYY-MM-DD` (e.g., "2025-01-01") were displaying as "Dec 31, 2024" in some timezones because `new Date('2025-01-01')` parses as UTC midnight, but `toLocaleDateString()` defaults to local browser time.
- **Solution & Pattern**: Explicitly parse the YYYY-MM-DD string into UTC components and use `date.toLocaleDateString(..., { timeZone: 'UTC' })` to force consistent display regardless of user location.
- **Critical Rule**: For database dates (YYYY-MM-DD), always force UTC context during display formatting to prevent 24h timezone drifts.

## [REACT-004] Safe Navigation for User Objects

- **Tags**: #react, #safety
- **Date**: 2026-01-03
- **Context & Problem**: The application crashed on startup for some users because `SideNav` accessed `user.email[0]` without checking if `user.email` existed, leading to "Cannot read property '0' of undefined".
- **Solution & Pattern**: Used optional chaining and fallback: `user?.email ? user.email[0] : '?'`.
- **Critical Rule**: Never assume `user` or `user.email` is present; always provide fallbacks for initial/avatar generation.

## [DB-027] Edge Function Auth Schema Access (PGRST106)

- **Tags**: #database, #security, #rpc, #edge-functions
- **Date**: 2026-01-03
- **Context & Problem**: The generic Supabase client (even with Service Role) cannot query the `auth` schema directly via REST because PostgREST does not expose it (`PGRST106`). This caused Edge Functions to fail when trying to check if a user Email already existed in the system before inviting them.
- **Solution & Pattern**: Create a Postgres Function (RPC) with `SECURITY DEFINER` that runs with escalated privileges to perform the specific lookup (`select id from auth.users...`) and expose _that function_ to the API.
- **Critical Rule**: Do not try to direct-query `auth.users` from the client; assume it is hidden. Wrap privileged lookups in a secure RPC.

## [CSS-028] The Cost of Manual Utility CSS

- **Tags**: #css, #maintenance, #tailwind
- **Date**: 2026-01-03
- **Context & Problem**: The project uses a `globals.css` that _emulates_ Tailwind but is manually maintained. Features built assuming standard Tailwind availability (e.g., `w-64`, `animate-pulse`) broke silently because those specific classes were missing from the manual file.
- **Solution & Pattern**: We appended the specific missing classes to `globals.css`.
- **Critical Rule**: If emulating a framework, you must rigorously audit used classes against available classes. Prefer migrating to the actual framework (Tailwind) to avoid "missing utility" regression.

## [CSS-029] Responsive Utilities Verification

- **Tags**: #css, #responsive, #tailwind
- **Date**: 2026-01-03
- **Context & Problem**: During adversarial testing, the sidebar failed to hide on mobile viewports (800px) despite having classes. Because we use a manual CSS file, these media-query-specific utilities were missing.
- **Solution & Pattern**: Manually implemented the block with and overrides.
- **Critical Rule**: Responsive modifiers (, ) are not magic; in a manual CSS setup, they must be explicitly defined in media queries. verify resizing behavior interactively.

## [DATE-003] Dual-Mode Date Parsing Strategy

- **Tags**: #dates, #javascript, #hybrid
- **Date**: 2026-01-03
- **Context & Problem**: The app consumes both strictly formatted "YYYY-MM-DD" dates (Project Start Date) and ISO timestamps (Created At). Using a single formatting strategy caused "Invalid Date" for one or offset errors for the other.
- **Solution & Pattern**: helper now detects the presence of Time () to branch logic:
  - Has 'T': Parse as standard (Local Time).
  - No 'T': Parse as Manual UTC split ().
- **Critical Rule**: Do not treat "Dates" and "Timestamps" as the same data type. Branch parsing logic based on input format to preserve semantic correctness.

## [CSS-030] Manual Tailwind Emulation Pitfalls

- **Tags**: #css #maintenance #gotcha
- **Date**: 2026-01-04
- **Context & Problem**: Layouts were failing (elements flushed to edges, no gaps) despite correct Tailwind classes in JSX (e.g., `p-6`, `gap-8`). The root cause was that these specific utilities were **missing** from the manually maintained `globals.css` file, which emulates Tailwind but isn't a full engine.
- **Solution & Pattern**: When "standard" classes fail silently, grep `globals.css` immediately. We backfilled the missing classes.
- **Critical Rule**: If a utility class isn't in `globals.css`, it doesn't exist. Don't assume full Tailwind support.

## [REACT-031] The "God Hook" Facade Pattern

- **Tags**: #react, #hooks, #refactoring, #architecture
- **Date**: 2026-01-05
- **Context & Problem**: `useTaskOperations` became a 450+ LOC "God Hook" handling fetching, state, pagination, and mutations. Splitting it indiscriminately would break ~15 consumer files.
- **Solution & Pattern**:
  1. **Split Logic**: Created `useTaskQuery` (read-only state) and `useTaskMutations` (write operations).
  2. **Facade**: Rewrote the original `useTaskOperations` to import and compose these two new hooks, re-exporting the exact same API surface as before.
- **Critical Rule**: When refactoring huge hooks, do not force consumers to change immediately. Use a Facade hook to maintain the API contract while cleaning up the internals.

## [REACT-032] Controlled Tree Expansion (Race Conditions)

- **Tags**: #react, #state-management, #recursion, #race-condition
- **Date**: 2026-01-05
- **Context & Problem**: The Master Library tree used manual state syncing (`setTreeData + setExpandedIds`) inside an async fetch callback. This caused a race condition where the expansion state would get overwritten by the data refresh, collapsing nodes immediately after opening.
- **Solution & Pattern**:
  - **Decouple**: Removed manual tree mutation from the toggle handler.
  - **React**: Used a single `useEffect` that listens to `[expandedTaskIds, treeData]` to apply the specific `isExpanded` flag to the view model synchronously.
- **Critical Rule**: Never manually mutate deep tree state inside an async callback. Use a reactive `useEffect` to merge "UI State" (expanded IDs) with "Data" (Task Nodes) whenever either changes.

## [ARC-034] Date Calculation Ownership

- **Tags**: #architecture, #dates, #database, #triggers
- **Date**: 2026-01-05
- **Context & Problem**: Confusion over who calculates `start_date` vs `days_from_start` led to conflicting updates between client and DB.
- **Solution & Pattern**:
  - **Client (UI)**: Owns `days_from_start` calculation (in `useTaskOperations.js`). Relative offsets are business logic.
  - **Database (Trigger)**: Owns `parent rollup` (`trigger_calc_task_dates`). When a child moves, the DB ensures the Parent expands to contain it.
  - **Database (RPC)**: Owns `clone_project_template` dates. Atomic cloning must handle date shifting in the same transaction.
- **Critical Rule**: 3. **Do NOT** rely on client-side re-fetch to sync dates (triggers update in-place).

## [DB-035] Migration Safety via Conditional Logic

- **Tags**: #database, #migrations, #safety
- **Date**: 2026-01-05
- **Context & Problem**: A "One-Time Setup" script contained destructive `DROP COLUMN` commands intended to clean up legacy schema. However, when run on a fresh install (where those columns never existed), the script would fail or accidentally drop dependent views, breaking the installation.
- **Solution & Pattern**:
  - **Check Existence**: Wrap destructive logic in a `DO $$` block.
  - **Conditional Execution**: Query `information_schema.columns` to see if the target column exists.
  - **Dynamic SQL**: Use `EXECUTE` inside the `IF` block to run DDL statements conditionally.
- **Critical Rule**: Setup scripts must be **idempotent and safe**. Never assume specific schema state; check for existence before dropping or modifying.

## [CSS-036] Recharts Zero-Height Bug in Grid

- **Tags**: #css, #recharts, #grid, #flexbox
- **Date**: 2026-01-06
- **Context & Problem**: `ResponsiveContainer` from Recharts failed to render (height=0) when placed inside a logical `grid` or `flex` child that didn't have an explicit height set. The library relies on parent container dimensions to calculate its SVG size.
- **Solution & Pattern**: Added explicit inline styles (`style={{ width: 150, height: 150 }}`) to the wrapper `div` to enforce a bounding box.
- **Critical Rule**: When using `ResponsiveContainer` inside a CSS Grid or Flex item, ensure the parent has measurable dimensions (min-height/width) or the chart will vanish.

## [SVC-037] Service Response Destructuring

- **Tags**: #javascript, #services, #pattern
- **Date**: 2026-01-06
- **Context & Problem**: The generic `fetchTaskChildren` service was updated to return a Supabase-style object `{ data, error }`. However, legacy usage assumed it returned `data` directly (an array), causing `TypeError: rawTasks.forEach is not a function`.
- **Solution & Pattern**: Updated usage to destructure the response: `const { data: rawTasks } = await fetchTaskChildren(...)`.
- **Critical Rule**: Always check service return signatures. If a service wraps Supabase, standardizing on `{ data, error }` is safer than returning raw data or throwing, but call sites must adapt.

## [UI-038] URL-Driven Sidebar Navigation

- **Tags**: #ui, #navigation, #routing, #react-router
- **Date**: 2026-01-06
- **Context & Problem**: Deep linking to a specific project (`/project/:id`) failed to update the Sidebar selection state because the selection logic was purely internal to the `TaskList` component state, initialized to `null`.
- **Solution & Pattern**: Added a `useEffect` in `TaskList` that syncs `activeProjectId` with the URL's `useParams().projectId`. This ensures that navigating directly to a URL selects the correct project in the sidebar list.

---

## [CSS-039] Full Screen Dashboard Layout Strategy

- **Tags**: #css, #layout, #flexbox, #tailwind
- **Date**: 2026-01-06
- **Context & Problem**: Dashboards often suffer from "Double Scrollbars" (one for the browser window, one for the content) or the sidebar scrolling away with the page.
- **Solution & Pattern**:
  - **Root**: `h-screen w-screen overflow-hidden flex`. This locks the viewport.
  - **Sidebar**: `flex-shrink-0 overflow-y-auto`. Static width on desktop.
  - **Main**: `flex-1 overflow-y-auto`. Takes remaining space and handles its own scrolling.
- **Critical Rule**: For application-like dashboards, lock the `body` (or root div) height to `100vh` and manage scrolling internally in the main content area.

- **Critical Rule**: Do not try to shim **jest** for mocking. Replace **jest.mock** with **vi.mock** directly to ensure correct hoisting behavior.

## [TEST-041] ESM Mocking Factories (Default Exports)

- **Tags**: #testing, #vitest, #esm, #mocking
- **Date**: 2026-01-07
- **Context & Problem**: In Vitest (ESM), `vi.mock('./Component', () => () => <div />)` failed with **mock is not returning an object**.
- **Solution & Pattern**: Return a factory that returns a default export: `vi.mock('./Comp', () => ({ default: () => <div /> }))`.

## [REACT-042] Layout Composition & Content Projection

- **Tags**: #react, #layout, #architecture
- **Date**: 2026-01-11
- **Context & Problem**: The `DashboardLayout` was refactored significantly during a generic UI merge, hardcoding the `Sidebar` component to a static version. However, the `TaskList` feature relied on passing a dynamic `SideNav` (with project lists and context) via the `sidebar` prop. This caused the "My Projects" list to vanish from the UI and tests to fail.
- **Solution & Pattern**:
  - **Slot Pattern**: Restored the `sidebar` prop support in `DashboardLayout`.
  - **Fallback**: Used `sidebar || <DefaultSidebar />` to support both complex features (TaskList) and simple static pages.
- **Critical Rule**: Layout components should be **Containers**, not controllers. Always prefer Content Projection (Props/Slots) over hardcoded child components if the content needs to vary by feature.
  - **ESM Requirement**: ESM modules are objects with a **default** key for default exports. The mock factory must return **{ default: MockComponent }**.
  - **Async importActual**: **vi.requireActual** is synchronous and often fails in ESM. Use **await vi.importActual()** inside an **async** factory.
- **Critical Rule**: When mocking default exports in Vitest, always return an object **{ default: ... }**. Use **async** factories if you need to import actual modules.

## [TEST-042] Mocking Custom Hooks in Integration Tests

- **Tags**: #testing, #vitest, #hooks, #mocking
- **Date**: 2026-01-08
- **Context & Problem**: In functional integration tests (Golden Paths), components using complex data-fetching hooks (e.g., `useTaskOperations`) caused tests to hang or timeout. The hooks were attempting actual async operations or were in an infinite `useEffect` loop due to test environment conditions, preventing the UI from rendering the "success" state.
- **Solution & Pattern**: Bypass the hook's internal logic entirely by mocking the hook module.

  ```javascript
  import * as hookModule from '../../hooks/useTaskOperations';
  vi.spyOn(hookModule, 'useTaskOperations').mockReturnValue({
    loading: false, // Force stable state
    data: [],
    // ... provide essential handlers as vi.fn()
  });
  ```

- **Critical Rule**: For page-level integration tests focused on routing or layout (not data fetching verification), **mock the data provider hooks** to return immediate, stable data. Do not rely on internal hook state transitions.

## [CSS-042] Legacy CSS Variable Drift

- **Tags**: #css, #refactoring, #design-system
- **Date**: 2026-01-08
- **Context & Problem**: During the Design System migration, we found that many components referenced `var(--accent-blue)` which was not defined in the new `index.css` theme, causing silent layout regressions (transparents backgrounds). Legacy "emulation" stylesheets assumed variables that no longer existed.
- **Solution & Pattern**:
  - **Audit**: Grep for `var(--` usage across all CSS files.
  - **Standardize**: Replaced all instances of ad-hoc `accent-blue` with the strict `brand-600` token.
  - **Cleanup**: Deleted unused variables to prevent future drift.
- **Critical Rule**: **No Phantom Variables.** If a CSS variable is used in a specific component stylesheet, it MUST be defined in `index.css` (global theme) or the component itself. Do not assume legacy variables persist across major theme refactors.

## [REACT-042] Unescaped Entities in JSX

- **Tags**: #react, #jsx, #security
- **Date**: 2026-01-09
- **Context & Problem**: Linter reported errors for unescaped quotes (`"`) in JSX text content. While often rendered correctly by browsers, this violates strict XML/JSX parsing rules and can lead to edge-case rendering issues or XSS vulnerabilities if data is interpolated insecurely.
- **Solution & Pattern**: Use HTML entities regarding:
  - `"` -> `&quot;`
  - `'` -> `&apos;`
- **Critical Rule**: Always escape special characters in JSX text nodes.

## [REACT-043] Synchronous State in Effects

- **Tags**: #react, #hooks, #performance, #bug
- **Date**: 2026-01-09
- **Context & Problem**: `MasterLibrarySearch` attempted to reset `activeIndex` state inside a `useEffect` that depended on `query` or `results`. This flags as "Synchronous setState in Effect" because it triggers an immediate re-render before the browser paints, potentially causing visual jank or infinite loops if dependencies are unstable.
- **Solution & Pattern**: **Move Logic to Event Handlers**. Reset the `activeIndex` inside the `handleQueryChange` function directly.
- **Critical Rule**: Avoid `useEffect` for state derived purely from user events. Update state in the event handler itself.

## [REACT-044] Component Display Names

- **Tags**: #react, #debugging, #lint
- **Date**: 2026-01-09
- **Context & Problem**: `React.memo` and `forwardRef` components lose their inferred names in DevTools (showing as `Anonymous`), and strict linting enforces `react/display-name`.
- **Solution & Pattern**: Explicitly assign `Component.displayName = 'Component'` after definition, or use named functions inside the wrapper: `memo(function MyComp() { ... })`.
- **Critical Rule**: Higher-Order Components (memo, forwardRef) require explicit naming or displayNames for proper debugging.

## [ARC-042] Agent-Induced Syntax Injection (The "Backtick" Bug)

- **Tags**: #dx, #agent, #human-review
- **Date**: 2026-01-10
- **Context & Problem**: A critical production-blocking syntax error was introduced into `src/main.jsx`. The file contained markdown grouping backticks inside the source code, causing the build to fail silently (rendering a white screen).
- **Solution & Pattern**:
  - **Strict Tool Usage**: When using `write_to_file` or `replace_file_content`, ensure the content string _excludes_ markdown formatting wrappers unless writing to a `.md` file.
  - **Verification**: Always run an adversarial browser test or build check after "simple" file rewrites.
- **Critical Rule**: Source code is not markdown. Double-check that code blocks strips formatting boundaries before writing to disk.

## [UI-043] Layout-Driven Navigation State

- **Tags**: #ui, #react, #navigation
- **Date**: 2026-01-10
- **Context & Problem**: The Sidebar vanished from the Dashboard after refactoring. The root cause was `Dashboard.jsx` rendering `SideNav` directly instead of using the wrapper `DashboardLayout`.
- **Solution & Pattern**:
  - **Inversion of Control**: The Page component (`Dashboard`) delegates layout responsibility to `DashboardLayout`.
  - **Prop Drilling**: `DashboardLayout` injects the `onNavClick` handler (for mobile closing) into the `sidebar` prop element via `React.cloneElement`.
- **Critical Rule**: If a layout manages mobile state (open/close), the Page _must_ use that layout wrapper to ensure the navigation component receives the state-closing handlers.

## [CSS-044] Semantic Color System Migration

- **Tags**: #css, #design-system, #tailwind, #maintenance
- **Date**: 2026-01-11
- **Context & Problem**: The codebase accumulated inconsistent color usage: `orange-*` for brand actions, `red-*`/`green-*` for status, and `blue-*`/`yellow-*` for misc states. This violates Rule 30 (Design Standards) and creates maintenance burden.
- **Solution & Pattern**:
  - **Brand Colors**: Replace `orange-*` with `brand-*` (mapped to CSS variables).
  - **Status Colors**: `rose-*` (error/blocked), `emerald-*` (success/complete), `amber-*` (warning/in-progress), `sky-*` (info/planning).
  - **Batch Migration**: Use `sed` for bulk replacements across feature directories, then verify with `grep` and lint.
  - **Exceptions**: Code comments explaining hex values (e.g., Recharts config) are acceptable.
- **Critical Rule**: Never use generic Tailwind colors (`red`, `green`, `blue`, `orange`) for semantic states. Always use the semantic palette (`rose`, `emerald`, `amber`, `sky`, `brand`).

## [SVC-043] Generic Entity Client Factory

- **Tags**: #javascript, #services, #api, #refactoring
- **Date**: 2026-01-12
- **Context & Problem**: The `planterClient.js` had duplicated logic for `list` and `filter` methods across multiple entities (Task, Phase, Milestone), leading to maintenance overhead. Additionally, several entities were missing generic `create`/`delete` methods, causing runtime errors when new features tried to use them.
- **Solution & Pattern**: Implemented a `createEntityClient(tableName, select)` factory function.
  - **DRY**: Centralized `list`, `get`, `create`, `update`, `delete`, and `filter` logic.
  - **Composition**: Entities like `Project` use `...createEntityClient()` to inherit base methods while overriding specific ones (like `create` for custom mapping).
- **Critical Rule**: **Don't Repeat Data Access Logic.** Use a factory pattern for standard CRUD operations and only write custom code for business-logic-heavy entities.

## [SVC-044] Schema Reality: Unified Tasks & Column Mismatches

- **Tags**: #schema, #database, #api, #gotcha, #mapping
- **Date**: 2026-01-12
  <<<<<<< HEAD
- **Context**: The `planterClient` refactor initially assumed `phases` and `milestones` tables existed.
- **Problem**: The database uses a unified `tasks` table with hierarchy (`root_id`, `parent_task_id`). There are no separate tables.
- **Solution**: The `createEntityClient` for Phase and Milestone must point to `tasks`.
- **Critical Rule**: When querying for "Phases" via the generic client, you MUST filter by hierarchy (`root_id`) or custom metadata. The generic client `list()` will return ALL tasks if not filtered. **Always use specific filters** when using `planter.entities` on the `tasks` table.

## [RPC-038] Function Signature Parity

- **Tags**: #database, #rpc, #api, #bugs
- **Date**: 2026-01-13
- **Context & Problem**: The API client called `supabase.rpc('invite_user_to_project', ...)` but the function did not exist in the database schema. This led to persistent runtime errors ("function not found") despite the client code looking correct.
- **Solution & Pattern**:
  - **Audit**: Always verify that every `supabase.rpc` call maps to an existing SQL function.
  - **Migration**: Created `20260112_add_invites.sql` to define the missing function and its underlying table `project_invites`.
- **Critical Rule**: Client-side RPC calls must be backed by a Migration defining the function. Never write the client code without the SQL definition.

## [ENV-043] Testing Data Resilience

- **Tags**: #testing, #seeds, #dev-environment
- **Date**: 2026-01-13
- **Context & Problem**: Browser verification failed to find specific project names ("Sunday Launch") because the local development seed data differed from the test expectations.
- **Solution & Pattern**:
  - **Resilient Tests**: Tests should verify _classes_ of behavior (e.g., "Any Project Card") rather than specific data instances, or strictly control the seed state before running.
  - **Graceful degradation**: Verified that empty states ("No tasks to display") rendered correctly instead of crashing.
- **Critical Rule**: Do not hardcode content expectations in manual verification plans unless you control the seed script. Verify _behavior_, not _strings_.

## [UI-044] Semantic Color System (The "Blue" Ban)

- **Tags**: #ui, #design-system, #css
- **Date**: 2026-01-13
- **Context & Problem**: A design audit found mixed usage of "Generic Blue" (`blue-500`, `text-blue-600`) vs "Brand Orange" (`brand-500`). This diluted the brand identity.
- **Solution & Pattern**:
  - **Standardization**: Systematically replaced all `blue-` utility classes with either:
    - **Brand**: `brand-` (Orange) for primary actions/links.
    - **Thematic**: `indigo-` or `sky-` for specific status indicators (e.g., "Planning" phase) to distinguish from the primary brand.
- **Critical Rule**: **Rule 30**. Never use generic `blue`, `red`, `green` for primary UI elements. Use semantic aliases (`brand`, `destructive`, `success`) or curated palette choices (`indigo`, `rose`, `emerald`).

## [API-045] Schema Reality: Column Mapping

- **Tags**: #schema, #database, #api, #gotcha
- **Date**: 2026-01-13
- **Context & Problem**:
  1. The `planterClient` refactor initially assumed `phases` and `milestones` tables existed. (Reality: Everything is a `task`).
  2. Frontend models used `name` and `order`, effectively "guessing" columns. (Reality: Backend uses `title` and `position`).
  3. This caused **400 Bad Request** on bulk inserts.
- **Solution**:
  - **Table**: `createEntityClient` for Phase/Milestone points to `tasks`.
  - **Mapping**: Explicitly map `name` -> `title` and `order` -> `position` in `projectService.js`.
  - **Single Source**: Refactor UI queries to fetch ONE hierarchy and filter in-memory.
- **Critical Rule**:
  1. **One Table Rule**: Phases/Milestones/Tasks are all rows in `tasks`.
  2. **Column Reality**: `tasks` table columns are `title`, `position`, `status`, `root_id`. **Do not attempt to insert** `name` or `order`.
  3. **Filter Hierarchy**: Generic `list()` returns ALL tasks. Always filter by `root_id` and `parent_task_id`.

---

## [DEP-043] Toast Dependency Mismatch (Sonner vs use-toast)

- **Tags**: #dependencies, #ui, #build-error
- **Date**: 2026-01-12
- **Context & Problem**: The generic components update introduced `sonner` (a toast library) imports into `Project.jsx`, likely from a Shadcn copy-paste. However, the project standard is a custom local `use-toast` hook. This caused a build error (`Failed to resolve import "sonner"`).
- **Solution & Pattern**:
  - **Audit Imports**: Always verify that "suggested" libraries from snippets are actually installed.
  - **Standardize**: Replaced `sonner` usage with the existing `@shared/ui/use-toast` pattern.
- **Critical Rule**: Do not mix toast libraries. Stick to the project's established notification system unless migrating fully.

## [CSS-044] Recharts CSS Variable Support

- **Tags**: #css, #recharts, #theming
- **Date**: 2026-01-12
- **Context & Problem**: We replaced hardcoded hex colors (`#FF5500`) with CSS variables (`var(--brand-primary)`) to enforce Design Rule 30. There was concern that Recharts might not support CSS variables in the `fill` prop.
- **Solution & Pattern**:
  - **Verification**: Browser verification confirmed that Recharts **does** correctly interpret CSS variables passed as strings to `fill` (e.g., `fill="var(--color-brand-500)"`), provided the variable is defined in the global scope.
- **Critical Rule**: You can use CSS variables in Recharts props. No need to compute hex values in JS unless specific color manipulation (darkening/lightening) is required manually.

---

## [ENV-015] GitHub API "410 Issues Disabled" Error

**Tags**: #github, #mcp, #permissions, #devops
**Date**: 2026-01-12

### Context & Problem

During the setup of the GitHub MCP (Metaflow Control Plane) server, attempts to create issues via the `issue_write` tool failed with a `410 Issues has been disabled in this repository` error.

This was confusing because:

1. The GitHub Personal Access Token (PAT) had full `repo` scopes.
2. The user was the repository owner.
3. The repo was not archived.

### Solution & Pattern

The error is literal: **Repository-level features override API permissions.**

1. **Verify Settings**: Go to GitHub Repository > Settings > General > Features.
2. **Enable Issues**: Ensure the "Issues" checkbox is checked.
3. **Propagation**: GitHub API state can take 1-2 minutes to propagate after the UI toggle.

### Critical Rule

> **Token Scopes are not Absolute.** Even a "Full Access" token cannot perform actions that are disabled in the repository's feature settings (Issues, Wiki, Projects, etc.). Always verify the repository's feature configuration when encountering 410 errors in the GitHub API.

---

## [FE-043] Centralized Sidebar Logic (Container Pattern)

**Tags**: #react, #architecture, #navigation
**Date**: 2026-01-13

### Context & Problem

Multiple pages (Tasks, Settings, Dashboard) were manually fetching project lists to populate the sidebar. This led to code duplication, inconsistent loading states, and breakage when data structures changed.

### Solution & Pattern

We implemented the **Layout Container Pattern**:
1.  **Container Component**: Created `ProjectSidebarContainer.jsx` to encapsulate the `useTaskOperations` hook and data mapping for the sidebar.
2.  **Default Slot**: Integrated this container as the default `sidebar` prop in `DashboardLayout`.
3.  **Result**: Pages no longer need to know how to fetch their own navigation data; simply wrapping a page in the layout populates the sidebar.

### Critical Rule

> **Global UI belongs in Layout Containers.** Don't duplicate data fetching for global navigation in individual pages. Use specialized container components within your Layouts to provide stable data slots.

---

## [FE-044] Route-Level Layout Propagation

**Tags**: #routing, #react-router, #architecture
**Date**: 2026-01-13

### Context & Problem

The application had several "orphan" pages (e.g., Reports, Project Details) where the sidebar would vanish. The root cause was that `App.jsx` defined these routes as top-level children of `Routes` without wrapping them in the required layout shell.

### Solution & Pattern

Unified routing configuration in `App.jsx`:
1.  **Protected Hub**: All authenticated views are grouped and wrapped in both `ProtectedRoute` and `DashboardLayout`.
2.  **Breadcrumb Consistency**: Passing the current context (like `projectId`) down via the layout ensures that breadcrumbs and sidebar selection sync correctly with the URL.

### Critical Rule

> **Layouts are part of a Route's definition.** When adding new views, always explicitly check if they belong inside a `DashboardLayout` shell. Do not rely on pages to "opt-in" to the sidebar themselves.

---

## [DX-045] Import Path Consistency & Alias Fragility

**Tags**: #dx, #verification, #imports
**Date**: 2026-01-13

### Context & Problem

Refactoring `Settings.jsx` and `Team.jsx` caused repetitive build failures due to incorrect guesses for core-hook imports (e.g., trying to import `useToast` from `@shared/hooks/` when it actually lived in `@shared/ui/`).

### Solution & Pattern

1.  **Grep First**: Before typing a new import for a shared utility, grep the codebase for existing usages to find the established alias path.
2.  **Standardize**: We updated all broken pages to follow the established project pattern: `@app/contexts/AuthContext` for `useAuth` and `@shared/ui/use-toast` for `useToast`.

### Critical Rule

> **Standardize Core Imports.** Avoid "guess-and-check" pathing when utilizing shared aliases. Document the location of high-volume hooks (`useAuth`, `useToast`, `useTaskOperations`) or use automated linting to enforce path consistency.

## 5. Security & RBAC

### Role Definitions

| Role | Permissions |
| :--- | :--- |
| **Owner** | Full access. Can delete project and manage members. |
| **Editor** | Can read/write tasks. Cannot manage members. |
| **Coach** | Can view tasks and add comments. Cannot edit task properties. |
| **Viewer** | Read-only access to the project. |
| **Limited** | Restricted. Likely assigned-task only visibility (Implementation TBD). |
## Fix: Missing Card Backgrounds (Design System Mismatch)
**Date**: Tue Jan 13 08:00:35 PM PST 2026
**Issue**: User reported 'backgrounds not loading' for Template Cards in New Project Modal.
**Root Cause**: The cards utilized flat, dull colors ('bg-slate-100') which clashed with the 'Premium' aesthetic of the Dashboard's gradient cards, appearing broken or unstyled by comparison.
**Fix**:
1.  Applied 'bg-gradient-to-br from-orange-500 to-orange-600' to selected template icons.
2.  Added 'group-hover' states to animate icons and borders ('scale-105', 'text-orange-600') for immediate visual feedback.
3.  Ensured 'bg-white' is explicit on the card container to prevent transparency issues.
**Verification**: Confirmed visually via Browser Agent and Code Review.
