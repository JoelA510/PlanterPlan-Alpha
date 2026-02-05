# Project Knowledge Base & Agent Lessons
> **INSTRUCTION FOR AGENT:** Read this file at the start of every session. These are the hard-earned lessons for PlanterPlan.

## 1. The "Modernity" Log (Stack Specifics)
*Specific API quirks for our 2026 stack (React 19, TW4, Vite 7).*

| Library | Version | The Rule / Quirk |
| :--- | :--- | :--- |
| `tailwindcss` | `v4.x` | Use `@theme` in CSS, not `tailwind.config.js`. Use `--color-*` variables for semantic theming (see [UI-025]). |
| `react` | `19.x` | No `forwardRef`. Use `useActionState` for form actions. Strict hydration checks. |
| `react-router` | `v7` | Ensure routes are defined in the new data-router format if modifying `App.jsx`. |
| `date-engine` | Custom | **NEVER** do raw date math. ALWAYS use `src/shared/lib/date-engine`. (See [ARC-034]). |

## 2. Production Findings (Active Rules & Patterns)

### [DOCS-001] External-Facing PR Descriptions
- **Context**: PR descriptions contained internal jargon ("Master Review", "Orchestrator") confusing to external reviewers.
- **Rule**: **No Internal Jargon.** PR descriptions must use industry-standard terms (e.g., "Refactoring", "Verification", "Fix"). Avoid referencing internal agent workflows or names.

### [ARC-013] Context Provider Hierarchy
- **Context**: Users experienced infinite loops/stale auth due to incorrect provider nesting.
- **Rule**: **Respect the Data Dependency Chain.** Order: `Auth` -> `Router` -> `Organization` -> `Task`.

### [ARC-034] Date Calculation Ownership
- **Context**: Confusion between client-side relative logic and server-side absolute logic.
- **Rule**: Client owns `days_from_start` (Business Logic). Database owns `parent rollup` (Triggers) and `cloning` (RPC).

### [BACKEND-003] Database Schema Drift
- **Context**: Browser verified failed because `public.people` was missing in DB despite being in `schema.sql`.
- **Rule**: `schema.sql` is a document, not state. Always sync with `supabase db push` and verify.

### [CSS-036] Recharts Zero-Height Bug in Grid
- **Context**: Charts vanished in Grid layouts.
- **Rule**: `ResponsiveContainer` requires a parent with measurable dimensions (explicit width/height or flex constraints).

### [CSS-039] Full Screen Dashboard Layout Strategy
- **Context**: Double scrollbars plague dashboards.
- **Rule**: Lock root to `h-screen w-screen overflow-hidden flex`. Scroll content areas `flex-1 overflow-y-auto`, not the body.

### [CONTEXT-001] Context Size Management
- **Context**: Large backup files blew up AI context window.
- **Rule**: Archive non-essentials. Use named imports. Check `git ls-files | xargs wc -l` before committing assets.

### [DB-001] RLS Recursion & The `root_id` Optimization
- **Context**: Recursive RLS policies caused infinite loops and crashes.
- **Rule**: **Never write recursive RLS.** Denormalize hierarchy identifiers (`root_id`) to the row to allow flat lookups.

### [DB-007] Trigger Idempotency
- **Context**: Triggers refiring on unchanged rows wasted cycles.
- **Rule**: **Triggers should be lazy.** Exit early if `NEW.value = OLD.value`. Trust user-provided IDs on INSERT if valid.

### [DB-014] RLS Silent Filtering
- **Context**: API returned 0 results with no error because RLS filtered rows due to missing scope params.
- **Rule**: **RLS is Silent.** If result is empty, check if you are passing the required filtering context (Org ID) that RLS expects.

### [DB-015] PL/pgSQL Ambiguous Column References
- **Context**: `root_id` variable collided with `root_id` column, causing ambiguity errors.
- **Rule**: **Hungarian Notation is MANDATORY.** Prefix variables (`v_root_id`) to distinguish from columns (`t.root_id`).

### [DB-026] Recursion Depth Guard
- **Context**: Cascading date updates caused stack overflows.
- **Rule**: Use `IF pg_trigger_depth() > 10` to guard against infinite trigger loops.

### [DB-027] Edge Function Auth Schema Access (PGRST106)
- **Context**: Edge functions couldn't check if email exists because `auth` schema is hidden from REST.
- **Rule**: Use a `SECURITY DEFINER` RPC to strictly expose necessary auth checks. Do not query `auth.users` directly.

### [DX-012] Zero-Tolerance Linting
- **Context**: Warnings accumulated, hiding real bugs.
- **Rule**: Enforce `max-warnings=0` in CI/Commit hooks. Fix warnings immediately.

### [FE-004] Date Recalculation Loops (React)
- **Context**: Bidirectional parent-child date syncing caused React loops.
- **Rule**: **Avoid Reflexive Date Logic.** Separate "Push" (Parent moves Child) from "Pull" (Child expands Parent) into distinct effects or atomic updates.

### [FE-005] Recursive Component Performance
- **Context**: Deep trees lagged during Drag-and-Drop.
- **Rule**: **Isolate Drop Zones.** Do not use a single global sortable context. Each parent manages its own children's sorting.

### [FE-011/DATE-002] UTC Date Normalization
- **Context**: Dates shifted by 1 day due to timezone differences.
- **Rule**: **Dates are Data.** Normalize to UTC Midnight (`T00:00:00.000Z`) immediately on input. Force UTC context on display.

### [PERF-025] Timezone Safety in Date Utils
- **Context**: `new Date('YYYY-MM-DD')` is unstable across browsers.
- **Rule**: **String-First Approach.** Work with `YYYY-MM-DD` strings directly where possible.

### [REACT-032] Controlled Tree Expansion (Race Conditions)
- **Context**: Async fetches wiped out local toggle state.
- **Rule**: Decouple state mutation from async handlers. Use `useEffect` to merge "UI Config" into "Data Model" synchronously.

### [RPC-020] Atomic Deep Cloning
- **Context**: Client-side cloning was flaky and slow.
- **Rule**: **Transactions belong in the DB.** Use Postgres RPC for multi-step write operations like deep cloning.

### [SEC-002/043] RLS Function Security & Recursion
- **Context**: Public RLS functions and recursion holes.
- **Rule**: **Never trust public functions in RLS.** Use `SECURITY DEFINER` with fixed `search_path`. Never make an RLS function query the table it protects.

### [SEC-023] Project Membership Initialization
- **Context**: Creators verified as "non-members" because membership row wasn't created yet.
- **Rule**: **Creators must be members.** Explicitly insert into `project_members` in the same transaction/flow as project creation.

### [SEC-024] Explicit Role Checking
- **Context**: String matching `"admin"` was insecure.
- **Rule**: **No Magic Strings.** Use `ROLES` constants. Strict equality only.

### [SVC-002] Deep Clone "Race Condition"
- **Context**: Parallel inserts failed FK constraints.
- **Rule**: **Topological Sort.** Insert Parents -> Children. Pre-allocate IDs in memory to build graph before writing.

### [SVC-006] Cancellable Search Requests
- **Context**: Fast typing caused stale search results to overwrite new ones.
- **Rule**: **Abort Stale Requests.** Use `AbortController` for all "type-ahead" mechanisms.

### [SVC-037] Service Response Destructuring
- **Context**: Services wrapping Supabase return `{ data, error }`, not `data`.
- **Rule**: Always destructure service responses. Do not assume array return types.

### [UI-003] User-Scoped Drag and Drop
- **Context**: Global position updates corrupted other users' data.
- **Rule**: **Scope strictly.** Positioning logic must always filter by `owner_id` or `project_id`.

### [UI-016] Optimistic Rollback Strategy
- **Context**: Failed drag operations triggered full reloads.
- **Rule**: **Snap Back.** On failure, revert local state via variable capture. Do not re-fetch unless necessary.

### [UI-017] Atomic Design & Elevation
- **Context**: Inconsistent shadows and styles.
- **Rule**: Use strict Atomic hierarchy (Atoms -> Molecules -> Organisms). Use global `--elevation-N` variables.

### [UI-018] Brand Identity System
- **Context**: Generic colors.
- **Rule**: **Use Variables.** Never hardcode hex. Use `brand-primary`, `brand-500` tokens.

### [UI-022] Modal Portals
- **Context**: Modals clipped by `overflow: hidden` parents.
- **Rule**: **Portal to Body.** Always render modals outside the DOM hierarchy using `createPortal`.

### [UI-038] URL-Driven Sidebar Navigation
- **Context**: Deep links didn't update navigation state.
- **Rule**: Sync UI state with URL params (`useParams`) in a `useEffect`.

## Development Findings (Historical Context & Deprecated Patterns)

### [CSS-028/030] Manual Tailwind Emulation Pitfalls
- **Analysis**: We used to emulate Tailwind in a manual CSS file. Missing classes caused silent failures.
- **Lesson**: If emulating a framework, audit missing classes rigorously. Ideally, migrate to real Tailwind (Done).

### [DB-004] Migration Consolidation
- **Analysis**: Migrations were fragmented. Consolidated into single snapshots.
- **Lesson**: Consolidate periodically. Use `IF EXISTS`.

### [DB-008] Ambiguous Column References in Seeds
- **Analysis**: Joins on `id` failed in seed scripts.
- **Lesson**: **Always alias tables** in complex queries (`p.id` not `id`).

### [DB-035] Migration Safety via Conditional Logic
- **Analysis**: Setup scripts crashed on fresh installs.
- **Lesson**: Wrap destructive logic (`DROP COLUMN`) in checks for existence.

### [ENV-010] Local Dev Port Selection
- **Analysis**: Dev server picking random ports broke Auth/CORS.
- **Lesson**: Enforce port 3000. Fail fast if occupied.

### [FE-019] Recursive Tree Expansion State (Legacy)
- **Analysis**: Prop instability caused whole-tree re-renders.
- **Lesson**: Merged visual state into data model. (Superseded by REACT-032).

### [FE-021] Hook Extraction for Complex Components
- **Analysis**: `TaskList` became a God Component.
- **Lesson**: Split by **Concern** (Drag vs Data vs Logic), not just by UI component.

### [REACT-031] The "God Hook" Facade Pattern
- **Analysis**: Refactoring a massive hook without breaking consumers.
- **Lesson**: Use a Facade Hook to maintain API compatibility while splitting internals.

### [FE-045] Form Field Name Consistency
- **Date**: 2026-01-25
- **Context**: `CreateProjectModal` sent `name` field but `useProjectMutations` expected `title`, causing silent project creation failure.
- **Rule**: **Field names must match between UI and API.** Add regression tests for form payload structure.

### [DND-002] Task Scope for Drag-and-Drop
- **Date**: 2026-01-25
- **Context**: `useTaskDrag` only received root tasks, so subtask dragging failed silently (IDs not found).
- **Rule**: **DnD context must include ALL draggable items.** Aggregate root tasks + hydrated subtasks before passing to drag handler.

### [SYNC-001] Query Key Alignment for Cache Invalidation
- **Date**: 2026-01-25
- **Context**: Sidebar didn't update after project creation because it used different data source than Dashboard.
- **Rule**: **Single source of truth for entity lists.** Components showing the same data must use the same hook/query key.

### [TEST-001] JSDOM matchMedia Mock Requirement
- **Date**: 2026-01-25
- **Context**: Tests failed with `window.matchMedia is not a function` after adding `ThemeContext` with system preference sync.
- **Rule**: **Mock `matchMedia` in `setupTests.js`.** JSDOM doesn't implement it. Include `addEventListener`/`removeEventListener` in the mock implementation to support reactive themes.
### [UI-025] Theme-Reactive Surface Standardization
- **Date**: 2026-01-25
- **Context**: Main layout and dashboard cards failed to toggle to dark mode due to hardcoded `bg-white` classes and a naming mismatch in the Tailwind v4 `@theme` block (`--color-bg-background` instead of `--color-background`).
- **Rule**: **Surfaces must be semantic.** Avoid hardcoded `bg-white` or `bg-slate-X` for structural areas. Use `--color-background` (`bg-background`) for page canvas and `--color-card` (`bg-card`) for widgets. Ensure Tailwind theme variables precisely align with their intended utility names to enable reliable dark mode inheritance.

### [AUTH-001] Data-Driven Authorization via RPC
- **Date**: 2026-01-25
- **Context**: Hardcoded admin email lists in `ViewAsProviderWrapper.jsx` violated security best practices and prevented dynamic admin management. Initial attempt to query `admin_users` table directly caused app hangs due to schema drift.
- **Rule**: **Never hardcode authorization checks.** Use database RPCs (e.g., `is_admin`) for role detection. Always wrap authentication enrichment in try/catch with fail-safe `setLoading(false)` to prevent infinite loading states when backend changes occur.

### [API-004] Robust Date Serialization
- **Date**: 2026-01-27
- **Context**: `createProjectWithDefaults` crashed with `TypeError` because `launch_date` from the UI was a string, not a Date object, causing `.toISOString()` to fail.
- **Rule**: **Always normalize before serialization.** Never assume a variable is a Date object. Wrap input in `new Date(value)` before calling Date methods to handle both strings and objects safely.

### [REACT-040] AuthContext Abort Safety
- **Date**: 2026-01-27
- **Context**: An unhandled `AbortError` during the initial session fetch caused the `loading` state to remain `true` indefinitely, hanging the application.
- **Rule**: **AbortErrors are not critical failures.** Explicitly check for `err.name === 'AbortError'` and treat it as a warning. **ALWAYS** ensure `setLoading(false)` executes (e.g., in a `finally` block or robust `catch` handler) to prevent UI lockup.

### [NET-005] Transient Network Abort Resilience
- **Date**: 2026-01-27
- **Context**: Persistent `AbortError`s were observed during local Supabase debugging, causing simple reads and writes to fail.
- **Rule**: **Retry on Abort.** Implement exponential backoff retry logic for critical API client methods (`list`, `create`). Do not allow a single canceled request to break the user flow.

### [NET-005] Troubleshooting AbortErrors
If AbortErrors persist after implementing retries:
1. **Check Connection Pooling**: Ensure Supabase connection pooling transaction mode is enabled.
2. **Verify Network Stability**: VPNs and strict firewalls can terminate long-lived connections.
3. **Increase Timeout**: In development, `main.jsx` StrictMode can double-invoke async calls, exacerbating race conditions. Ensure `AuthContext` timeout is > 10s.
### [AUTH-006] Critical Path User Fetching
- **Date**: 2026-01-31
- **Context**: `supabase.auth.getUser()` calls within the `projectService` `create` logic caused random `AbortError`s and race conditions, failing project creation.
- **Rule**: **Context Injection.** Do not fetch the user inside service execution methods. Pass the authenticated user ID explicitly from the UI layer (e.g., via `useAuth`) into the service.

### [UI-040] React Day Picker v8 vs v9 Attributes
- **Date**: 2026-01-31
- **Context**: Calendar component styles broke (misaligned grid, missing headers) because the component used `react-day-picker` v8 class keys (`caption`, `table`) while v9 was installed.
- **Rule**: **Version Check Styles.** When styling library components, verify the installed version matches the style API. For `react-day-picker` v9, use `classNames` with keys like `month_caption`, `month_grid`, and `weekdays`.

### [NET-006] Client-Side Timeouts for Vital Fetches
- **Date**: 2026-02-01
- **Context**: Login flow hung indefinitely because `planter.auth.me()` waited for a stalled Vite HMR WebSocket connection.
### [UI-041] Optimistic UI Rollback Clarity
- **Date**: 2026-02-03
- **Context**: Failed task drag operations caused the UI to stay in the dropped state because the "revert" logic stacked a new optimistic update on top of the old one instead of clearing it.
- **Rule**: **Commit to Revert.** To rollback an optimistic update, do not apply a new "inverse" update. Explicitly "commit" (clear) the pending optimistic ID to reveal the server state.

### [AUTH-007] Deduplicated Session Handling
- **Date**: 2026-02-03
- **Context**: `AuthContext` had duplicate logic in `useEffect` (initial load) and `onAuthStateChange`. This increased the surface area for bugs and race conditions.
- **Rule**: **Single Source of Session Truth.** Extract session processing into a `handleSession` function and use it for both initialization and event listening.

### [SEC-044] Client-Side XSS Sanitization
- **Date**: 2026-02-03
- **Context**: Stored XSS vulnerability allowed malicious scripts in Task Titles and Project Descriptions.
- **Rule**: **Trust Nothing.** Even with React's escaping, use `dompurify` for any user-generated content that *might* be rendered as rich text. Verify `onerror` attributes are stripped.

### [SEC-045] SQL Injection in Sort Parameters
- **Date**: 2026-02-03
- **Context**: Dynamic SQL sorting via `rpc` exposed potential injection vectors.
- **Rule**: **Allowlist Sort Columns.** Validate sort parameters against a strict set of allowed column names before passing them to the database query.

