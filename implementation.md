## Working State

* Goal: Execute the remaining P0 fixes from the latest release review and validate previously applied patches are still correct.
* Constraints: No feature creep. Stabilization only. Minimize blast radius.
* Known P0s from the latest review:

  * DB: Supabase instance still running insecure `invite_user_to_project` + permissive `project_invites` INSERT (schema drift vs repo migration).
  * UI: Dashboard crash because it calls `Task.listByCreator` but `Task` client lacks it; UI expects `task.project_id`.

## Assumptions

* Antigravity IDE agent has repo access and can run local commands.
* Supabase dashboard access is available to run SQL and view logs.
* The repo already contains `docs/db/migrations/2026_02_16_harden_invites.sql` (or equivalent) as referenced in the review.

---

## Implementation Plan for Gemini 3 Pro (High) in Antigravity IDE

### Phase 0 - Prep and Safety Rails (required)

1. Create a working branch

* `git checkout main && git pull`
* `git checkout -b stabilize/v1.0-p0s`

2. Confirm clean install/build baseline

* `npm ci`
* `npm run build` (must pass before edits)
* If Playwright exists: `npx playwright install --with-deps`

3. Capture current DB state (rollback anchor)

* In Supabase SQL Editor:

  * Export schema or save current function/policy definitions:

    * `invite_user_to_project`
    * `project_invites` policies
* If you have a schema dump job/script, run it now and save as `pre_stabilize_schema.sql` locally.

Acceptance:

* Local build succeeds.
* You have a copy of current DB function/policy SQL to restore if needed.

Rollback:

* `git reset --hard origin/main` for code.
* Re-apply saved SQL definitions for DB objects.

---

### Phase 1 - DB P0: Stop Invite Takeover (highest priority)

Objective: Ensure editors cannot assign `owner` and cannot demote owners; remove reliance on permissive policy + insecure SECURITY DEFINER behavior.

Steps:

1. Locate migration in repo

* Open: `docs/db/migrations/2026_02_16_harden_invites.sql`
* Confirm it:

  * Replaces `public.invite_user_to_project(...)` with role hierarchy enforcement
  * Hardens `project_invites` INSERT policy (editor cannot create owner invites)

2. Apply migration to Supabase (production-like instance)

* Copy/paste migration SQL into Supabase SQL Editor and run.
* Immediately re-dump schema (or re-run your dump script) to confirm remote schema matches.

3. Verify with direct SQL checks

* Confirm function text includes:

  * Role allowlist validation
  * Editor cannot assign owner
  * Editor cannot modify existing owners
* Confirm `project_invites` INSERT policy blocks role = `owner` for editors.

Manual verification (must do):

* As `editor` in a project:

  * Attempt invite with role `owner` -> must fail.
  * Attempt to change an existing owner role via invite -> must fail.
* As `owner`/`admin`:

  * Invite editor/viewer -> must succeed.

Acceptance:

* Privilege escalation path is closed on the live DB.
* Schema dump reflects the hardened function/policies (no drift).

Rollback:

* Re-run the saved `pre_stabilize` SQL to restore function/policies (only if absolutely necessary).
* If rollback is used, stop and diagnose why the hardened migration broke app flows before proceeding.

---

### Phase 2 - Frontend P0: Fix Dashboard Crash (Task.listByCreator missing)

Objective: Add `Task.listByCreator` to the API adapter and ensure returned rows include `project_id` expected by Dashboard.

Steps:

1. Patch `src/shared/api/planterClient.js`

* Find the `Task:` entity block.
* Add `listByCreator(uid)` that:

  * Calls PostgREST for `tasks`
  * Adds `project_id:root_id` alias so Dashboard sees `task.project_id`
  * Encodes `uid`

Drop-in patch (adjust formatting to match file style):

```js
// inside planterClient.js export object
Task: {
  ...createEntityClient('tasks'),
  listByCreator: async (uid) => {
    const enc = encodeURIComponent;
    return rawSupabaseFetch(
      `tasks?select=*,project_id:root_id&creator=eq.${enc(uid)}&origin=eq.instance`,
      { method: 'GET' }
    );
  },
},
```

2. Validate Dashboard call site expectations

* Open `src/pages/Dashboard.jsx` around the call (reported ~L65-83).
* Confirm it calls `planter.Task.listByCreator(...)` (or equivalent) and reads `task.project_id`.

Acceptance:

* Navigating to Dashboard no longer throws.
* Data renders (or empty state) without runtime error.

Rollback:

* Revert only this change if it causes PostgREST errors (keep DB fixes).

---

### Phase 3 - P1: Fix Project select query spacing bug

Objective: Remove stray spaces in PostgREST `select=` strings that can cause inconsistent query parsing.

Steps:

1. Edit `src/shared/api/planterClient.js`

* Find `Project.get` / `Project.update` (reported ~L276 in prior review).
* Remove spaces in the `select` string (example issue: `"select=*, name:title, ..."` -> should be `"select=*,name:title,..."`)

Acceptance:

* Project GET/UPDATE calls succeed consistently (no 400 due to malformed select).

Rollback:

* Revert only the select-string edits.

---

### Phase 4 - Stability: Stop Swallowing List Errors (prevent “data vanished” false negatives)

Objective: Remove terminal `.catch(() => [])` patterns so React Query (or callers) can surface real error state.

Steps:

1. In `src/shared/api/planterClient.js`

* For `Project.list` (and any other list methods with terminal catch):

  * Remove `.catch(() => [])`
  * Allow `retry(...)` to throw so `isError` can trigger UI messaging

2. Confirm calling hooks/pages handle errors

* Search for list usage and ensure they don’t assume “[] means no projects” without checking error state.

Acceptance:

* If API fails (RLS/network), UI shows error state (not “No projects”).

Rollback:

* If UI hard-crashes due to unhandled throws, add minimal error boundary handling at the existing boundary (no new feature work).

---

### Phase 5 - Cleanup/Perf Guardrails (low risk, keep small)

Objective: Reduce runtime noise and bundle risk without changing behavior.

Steps:

1. Strip or gate console logs in hot paths

* Search for `console.warn` / `console.log` in `planterClient` and list methods.
* Remove noisy logs or guard behind a `DEV` flag already present in codebase.

2. Run production build and check for warnings

* `npm run build`

Acceptance:

* No new build warnings/errors.
* No behavioral changes.

Rollback:

* Revert only log cleanup if it accidentally removed needed diagnostics.

---

## Verification Checklist (must run in this order)

### Local automated

1. `npm ci`
2. `npm run build`
3. If tests exist:

* `npm test` (or `npm run test`)
* Playwright smoke: `npx playwright test e2e/journeys/dashboard.spec.ts`

### Manual end-to-end smoke (minimum set)

1. Auth

* Sign in
* Refresh page (ensure AuthContext does not “flash downgrade”)

2. Dashboard

* Loads without crash
* Shows created/joined projects/tasks (or correct empty state)

3. Create Project

* Default create flow works (the earlier “delegate to createProjectWithDefaults” fix remains intact)

4. Settings

* Update profile works (expects `planter.auth.updateProfile` wired to `supabase.auth.updateUser`) (see [Supabase docs for `updateUser`](https://supabase.com/docs/reference/javascript/auth-updateuser))

5. Invites

* Editor cannot invite owner
* Owner/admin can invite roles as expected

---

## Deliverables the Agent Must Produce

* PR on `stabilize/v1.0-p0s` containing:

  * `planterClient` Task.listByCreator patch
  * Project select spacing fix
  * Removal of error-swallowing list catches
  * Log cleanup (optional)
* Supabase SQL executed:

  * `2026_02_16_harden_invites.sql` applied
* Evidence artifacts:

  * Screenshot/text capture of SQL success
  * Post-migration schema dump snippet showing hardened function/policy
  * Test run output (build + Playwright smoke)

---

## Single Blocker Rule (agent behavior)

If any P0 step fails:

* Stop further phases.
* Collect exact error output + failing query/endpoint + relevant file/line.
* Fix only the smallest change that restores correctness, then re-run Phase verification before proceeding.
