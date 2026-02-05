# MASTER_REMEDIATION_PLAN.md

### [Priority P0] Secure Supabase Client & Env Validation
**Source:** Codex (Security Logging) + Sonnet (Env Validation)
**Context:** The client logs sensitive credentials to the console, and the application lacks runtime validation for missing environment variables.
**Agent Instruction:**
> **1. Context Loading:** Read `src/app/supabaseClient.js` and `vite.config.js`.
> **2. Pre-Validation:** Run `grep "console.log" src/app/supabaseClient.js` to confirm the leak exists.
> **3. Execution:**
>    - Remove the `console.log` statement printing the URL/key.
>    - Add runtime checks: If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing, throw a clear Error.
> **4. Post-Validation:** Run `npm run build`. Manually check the build output or start the dev server to ensure it doesn't crash but *does* fail if you temporarily rename the `.env` file.

### [Priority P0] Fix Auth Role Fallback Vulnerability
**Source:** Codex
**Context:** If the `is_admin` RPC fails, the system defaults the user role to `'owner'`, potentially granting elevated privileges on error.
**Agent Instruction:**
> **1. Context Loading:** Read `src/app/contexts/AuthContext.jsx`.
> **2. Pinning Test:** Create `src/tests/unit/AuthContext.security.test.jsx`.
>    - Mock `supabase.rpc` to reject (simulate failure).
>    - Render `AuthProvider`.
>    - **Assert:** `user.role` MUST NOT be 'owner'. (This test should FAIL currently).
> **3. Execution:** Refactor `getSession` and `onAuthStateChange` logic. If RPC fails, default to `'viewer'` or `'member'`.
> **4. Verification:** Run `npm test src/tests/unit/AuthContext.security.test.jsx`. It must PASS.

### [Priority P0] Sanitize User Input (XSS Prevention)
**Source:** Sonnet
**Context:** User-generated content (titles, descriptions) is rendered without sanitization, creating XSS vectors.
**Agent Instruction:**
> **1. Execution:**
>    - `npm install dompurify`.
>    - Create `src/shared/lib/sanitize.js` exporting `sanitizeHTML`.
>    - Open `src/features/tasks/components/TaskItem.jsx`. Wrap `task.title` rendering with the sanitizer.
>    - Open `src/features/projects/components/ProjectCard.jsx`. Wrap `project.name` and `description` with the sanitizer.
> **2. Verification:** Create a test `src/tests/unit/XSS.test.jsx` that renders a TaskItem with `<script>alert(1)</script>` as the title and asserts the script tag is removed from the DOM.

### [Priority P0] Prevent SQL Injection in Sort Parameters
**Source:** Sonnet
**Context:** Service layers construct dynamic SQL queries using unsanitized sort parameters.
**Agent Instruction:**
> **1. Pinning Test:** Create `src/tests/unit/TaskService.security.test.js`. Call `getTasksForUser` with `sortColumn: "id; DROP TABLE tasks;"`. Assert that it currently *attempts* to run this query (or mock the supabase client to capture the string).
> **2. Execution:**
>    - Create `src/shared/lib/validation.js` exporting `validateSortColumn`.
>    - Open `src/features/tasks/services/taskService.js`. Validate inputs before passing to `.order()`.
>    - Open `src/features/projects/services/projectService.js`. Apply same validation.
> **3. Verification:** Run the test. It should now throw a validation error before calling Supabase.

### [Priority P0] Patch RLS: Prevent Member Injection
**Source:** Sonnet (Adapted location)
**Context:** Current RLS policies may allow authenticated users to insert themselves as members of projects they don't own.
**Agent Instruction:**
> **1. Context Loading:** Read `docs/db/schema.sql` to understand the `project_members` table structure.
> **2. Reproduction Script:** Create `scripts/security/repro_member_injection.js`.
>    - Use a test user token.
>    - Attempt to insert a row into `project_members` for a project the user *does not* own.
>    - Assert that the insert *succeeds* (confirming the vulnerability).
> **3. Execution:** Create `docs/db/20260202_fix_member_injection.sql` that drops the old policy and adds a new one checking for Ownership OR Invitation.
> **4. Verification:** Apply the SQL (if connected) or instruct the user to apply it. Then run `node scripts/security/repro_member_injection.js` and assert it now *fails* with RLS violation.

### [Priority P1] Fix Optimistic UI Race Condition
**Source:** Sonnet
**Context:** `useTaskBoard` updates local state blindly. If the server request fails, the UI remains in an invalid state.
**Agent Instruction:**
> **1. Context Loading:** Read `src/features/tasks/hooks/useTaskBoard.js`.
> **2. Execution:** Refactor `handleStatusChange`.
>    - Pattern: Capture `previousTasks` -> `setTasks` (Optimistic) -> `await updateTask` -> `catch` (Revert to `previousTasks` + Toast).
> **3. Verification:** Manually verify by throttling network to "Offline" in DevTools, dragging a task, and ensuring it snaps back.

### [Priority P1] Fix Realtime Subscription Memory Leaks & Scope
**Source:** Codex + Sonnet
**Context:** Subscriptions do not clean up properly on unmount, and `useProjectRealtime` listens to global events if `projectId` is null.
**Agent Instruction:**
> **1. Context Loading:** Read `src/features/projects/hooks/useProjectRealtime.js`.
> **2. Execution:**
>    - Add check: `if (!projectId) return;`.
>    - Ensure `useEffect` returns a cleanup function calling `supabase.removeChannel`.
>    - Apply same to `src/features/tasks/hooks/useTaskSubscription.js`.
> **3. Verification:** Review code to ensure `useEffect` return values are explicit cleanup functions.

### [Priority P1] Fix Infinite Loop in ViewAsContext
**Source:** Sonnet
**Context:** `ViewAsContext` effect dependencies can trigger infinite re-renders when toggling roles.
**Agent Instruction:**
> **1. Context Loading:** Read `src/app/contexts/ViewAsContext.jsx`.
> **2. Execution:** Implement `isMounted` ref pattern in the `useEffect` fetching user data. Prevent state updates if unmounted.
> **3. Verification:** `npm run lint` to ensure dependency arrays are correct.

### [Priority P2] Fix Mobile Layout Grid
**Source:** Sonnet
**Context:** `Dashboard.jsx` uses fixed pixel widths/grids that break on mobile.
**Agent Instruction:**
> **1. Execution:**
>    - Open `src/pages/Dashboard.jsx`. Replace fixed grid cols with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
>    - Open `src/styles/pages/dashboard.css`. Remove `width: 1200px` rules.
> **2. Verification:** `npm run build`.

### [Priority P2] Standardize Chart Colors
**Source:** Codex + Sonnet
**Context:** Charts use hardcoded hex values (`#ccc`, `#e2e8f0`) instead of Design System tokens.
**Agent Instruction:**
> **1. Execution:**
>    - Open `src/features/reports/components/PhaseBarChart.jsx`. Use `var(--color-slate-200)`.
>    - Open `src/shared/ui/chart.jsx`. Replace hardcoded colors with CSS variables.
> **2. Verification:** Visual check.

### [Priority P3] Remove Zombie Code & Console Logs
**Source:** Codex + Sonnet
**Context:** Production code contains debug logs, unused imports, and commented-out blocks.
**Agent Instruction:**
> **1. Execution:**
>    - `src/features/tasks/services/taskService.js`: Remove `console.log`.
>    - `src/features/tasks/components/TaskDependencies.jsx`: Remove unused imports.
>    - `src/features/tasks/components/TaskList.jsx`: Delete commented blocks.
> **2. Verification:** `npm run lint` (Should show fewer warnings).

### [Priority P3] Consolidate CSV Exports
**Source:** Sonnet
**Context:** `export-utils.js` contains duplicate/redundant export functions.
**Agent Instruction:**
> **1. Execution:**
>    - Refactor `src/shared/lib/export-utils.js` to a single `exportToCSV`.
>    - Update usages in `src/features/projects/components/ProjectHeader.jsx`.
> **2. Verification:** `npm run build`.