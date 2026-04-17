## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 22 shipped to `main`:
- `77d81d4 Merge Wave 22 Task 1: supervisor-report Resend dispatch`
- `fe90a92 Merge Wave 22 Task 2: library search dedupe`
- `325d23a Merge Wave 22 Task 3: coaching task tagging + RLS + cross-cutting docs`
- `691fe39 fix(wave-22): address PR #146/#147/#148 review feedback`
- `bcd1aa6 docs(wave-22): post-merge documentation currency sweep`

Spec is at **1.9.0**. §3.3 Specialized Task Types (Coaching half), §3.5 "hide already-present" library dedupe, §3.6 Supervisor Reports live-dispatch, and the Coach Role Tagging known-gap are all flipped. §6 Backlog now tracks three Wave 22 carve-outs plus the older deferred items (Gantt, Collaboration Suite, PWA, localization, etc.).

**Gate baseline going into Wave 23: `npm run lint` → 0 errors (7 pre-existing warnings), `npm run build` clean, `npx vitest run` → 43 files / 524 tests passing.** Do not regress.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-23-coach-auto-assign`
- Task 2 → `claude/wave-23-creatorship-rename`
- Task 3 → `claude/wave-23-completion-unify`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 23 scope

Three tasks, each scoped tight. One closes a Wave 22 §6 carve-out (completes the Coaching feature loop). Two close long-standing technical-debt entries from `docs/dev-notes.md` — small, revertable DB migrations with high blast-radius reduction.

---

### Task 1 — §6 carve-out: Coach auto-assignment on coaching-task creation

**Commit:** `feat(wave-23): auto-assign coaching tasks to the project Coach`

Closes the "Coach auto-assignment on coaching-task creation" entry in `spec.md` §6 Backlog. Wave 22 shipped `settings.is_coaching_task` tagging + the additive RLS UPDATE policy; this wave wires the complementary UX: when a task is flagged as coaching **and** the project has exactly one `coach`-role member, auto-set `assignee_id` to that coach. Zero or multiple coaches → leave `assignee_id` unchanged.

1. **DB trigger** (`docs/db/migrations/2026_XX_XX_coaching_auto_assign.sql`, NEW)
   - `BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION set_coaching_assignee()`.
   - Function fires only when `NEW.settings ->> 'is_coaching_task' IS TRUE` AND either the row is new OR the flag is transitioning from falsy → true OR `NEW.assignee_id IS NULL`.
   - Looks up `project_members WHERE project_id = COALESCE(NEW.root_id, NEW.id) AND role = 'coach'`. If exactly one row returns, `NEW.assignee_id := that_user_id`. Otherwise, no-op.
   - Never overwrites a non-null `assignee_id` — user intent wins over automation.
   - Mirror the `CREATE FUNCTION` + trigger binding into `docs/db/schema.sql` so the SSoT stays accurate.

2. **Settings normalization guard** (`src/features/tasks/lib/coaching-form.ts`)
   - No code change expected, but confirm the existing `applyCoachingFlag` helper doesn't interfere with the new trigger path. Add a short JSDoc note cross-referencing the trigger so future readers see both halves of the behavior.

3. **UI feedback** (`src/features/tasks/components/TaskDetailsView.tsx`, `src/features/tasks/components/TaskForm.tsx`)
   - No new controls. The assignee dropdown already reflects whatever the DB returns, so the trigger's write surfaces organically after the next refetch. If the task's `useUpdateTask`/`useCreateTask` mutation has an optimistic payload that omits `assignee_id`, force a refetch (`queryClient.invalidateQueries`) on success so the UI picks up the server-assigned coach immediately.

4. **Architecture doc** (`docs/architecture/tasks-subtasks.md`)
   - In the existing `## Coaching Tasks (Wave 22)` section, append an "Auto-assignment (Wave 23)" sub-bullet describing the trigger, the exactly-one-coach rule, and the "user intent wins" non-overwrite guard.

5. **Tests**
   - Unit tests: the trigger is DB-level and there is no Postgres test harness in-repo yet (noted in Wave 22). Add a **trigger smoke script** at `docs/db/tests/coaching_auto_assign.sql` that exercises the three branches (zero coaches → no-op, one coach → assigned, two coaches → no-op) using `SET LOCAL role authenticated` + inserted fixtures. Document the invocation in the PR description; wiring it into CI is **out of scope**.
   - `Testing/unit/features/tasks/hooks/useTaskMutations.coachingRefetch.test.ts` (NEW) — asserts that a successful create/update flipping `is_coaching_task: true` enqueues a `invalidateQueries(['projectHierarchy', projectId])` so the UI picks up the trigger's assignment.

**DB migration?** Yes — one additive BEFORE trigger + its function. Revertable via `DROP TRIGGER` + `DROP FUNCTION`.

**Out of scope:** any UX that proactively *picks* between multiple coaches (defer to a follow-up wave once Team Management surfaces the selector); any change to existing RLS policies; any change to `applyCoachingFlag` behavior.

---

### Task 2 — Dev-notes: rename `check_project_ownership` to reflect its actual semantics

**Commit:** `chore(wave-23): rename check_project_ownership → check_project_creatorship + audit callers`

Closes the `check_project_ownership is a latent auth bug` entry in `docs/dev-notes.md`. The function checks `tasks.creator = uid`, **not** the `owner` role in `project_members`. The name is misleading and every RLS policy that depends on it is making a decision that doesn't match its documentation. This task does **not** change behavior — it only clarifies names and audits callers. Behavior-change is deferred until every caller's intent is explicit.

1. **Function rename** (`docs/db/migrations/2026_XX_XX_rename_project_creatorship.sql`, NEW)
   - `CREATE OR REPLACE FUNCTION public.check_project_creatorship(pid uuid, uid uuid) RETURNS boolean` with the **exact** body of the current `check_project_ownership`.
   - Keep the old function as a thin shim for one release: `CREATE OR REPLACE FUNCTION public.check_project_ownership(pid uuid, uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT public.check_project_creatorship(pid, uid) $$;` — so existing RLS policies keep working unchanged. Drop in a later wave once every caller migrates.
   - Mirror both definitions into `docs/db/schema.sql`.

2. **Caller audit** (`docs/db/schema.sql` grep)
   - Walk every RLS policy that references `check_project_ownership` and add an inline comment per callsite stating the **intent** (creatorship vs. ownership). Do **not** change the call itself yet — the rewrite happens in a follow-up wave once each policy's intent is confirmed with the domain owner.
   - Typical finding: `project_members` table policies that allow the project creator to self-insert as the initial owner genuinely want creatorship (bootstrap semantics). `tasks`, `people`, `task_resources`, and `task_relationships` policies that use it probably want ownership but were leaning on it as a convenient bypass.

3. **Audit summary doc** (`docs/architecture/auth-rbac.md`)
   - New `## Creatorship vs. Ownership (Wave 23 audit)` sub-section under "Business Rules & Constraints" listing every RLS policy that currently calls the shim, with the inferred intent per row. This becomes the shopping list for a future behavior-change wave.

4. **Tests**
   - **Manual `psql` smoke** documented in the PR description: assert that every current policy evaluates identically before and after the rename (use `pg_policies` + `EXPLAIN` sanity-check). No Postgres test harness exists in-repo yet — same note as Wave 22 Task 3.

**DB migration?** Yes — additive (new function + shim). Zero behavior change.

**Out of scope:** rewriting any RLS policy to actually use ownership instead of creatorship; adding a `check_project_ownership` replacement that queries `project_members`; dropping the shim. All three belong to a follow-up wave after the audit lands.

---

### Task 3 — Dev-notes: unify dual completion signals via trigger

**Commit:** `fix(wave-23): derive is_complete from status via trigger to prevent desync`

Closes the `Dual completion signals` entry in `docs/dev-notes.md`. Today `is_complete` (boolean) and `status = 'completed'` (text) both express completion but are consumed by different triggers (`check_phase_unlock` → `is_complete`, `handle_phase_completion` → `status`). If they drift, only one fires and phase unlocking silently breaks. Wave 23 introduces a `BEFORE UPDATE` trigger that keeps them lockstep — the app layer already best-effort mirrors them in `updateStatus`, but the trigger is the backstop that catches raw SQL updates and future bugs.

1. **Trigger** (`docs/db/migrations/2026_XX_XX_sync_task_completion.sql`, NEW)
   - `CREATE FUNCTION public.sync_task_completion_flags()` + `CREATE TRIGGER sync_task_completion BEFORE INSERT OR UPDATE ON public.tasks`.
   - Rule: if `NEW.status IS DISTINCT FROM OLD.status`, set `NEW.is_complete := (NEW.status = 'completed')`. Symmetrically, if `NEW.is_complete IS DISTINCT FROM OLD.is_complete`, set `NEW.status := CASE WHEN NEW.is_complete THEN 'completed' ELSE 'todo' END` — but only when the caller did **not** also change `status` in the same update (i.e., only one side is moving).
   - Both-side updates respect the caller's intent (detect via `NEW.status IS DISTINCT FROM OLD.status AND NEW.is_complete IS DISTINCT FROM OLD.is_complete` — if both are changing, trust both).
   - INSERT path: if `NEW.status = 'completed'` force `NEW.is_complete := true`; else `NEW.is_complete := COALESCE(NEW.is_complete, false)`.
   - Mirror into `docs/db/schema.sql`.

2. **Remove app-layer mirror once trigger is live** (`src/shared/api/planterClient.ts`, `src/features/tasks/hooks/useTaskMutations.ts`)
   - Audit `updateStatus` in planterClient and `useUpdateTask` for places that manually set both `is_complete` and `status` on the same write. If the trigger covers them, drop the redundant field from the payload and let the DB backfill. Optimistic updates in React Query still need both keys in the cache (the UI reads both) — only the *server* payload can be trimmed. Document this in a short JSDoc block over `updateStatus`.

3. **Architecture doc** (`docs/architecture/tasks-subtasks.md`)
   - Replace the current Auto-Completion state-machine bullet with a note that the trigger now guarantees `is_complete === (status === 'completed')` at the DB layer. Keep the app-layer mirror (bubble-up logic in `updateStatus`) intact — the trigger is belt-and-suspenders, not a replacement for cascade/bubble behavior.
   - Cross-reference `docs/dev-notes.md` and flip/remove that note.

4. **Dev-notes cleanup** (`docs/dev-notes.md`)
   - Flip the "Dual completion signals" section to resolved (strike-through or "**Resolved (Wave 23).**" prefix) pointing to the migration file and the architecture doc update.

5. **Tests**
   - `Testing/unit/shared/api/planterClient.updateStatus.syncflags.test.ts` (NEW) — assert that a status-only mutation through `updateStatus` now sends *only* `status` (not both fields) to the DB; cache/optimistic update still writes both. Use the existing `createChain()` harness.
   - DB trigger smoke script at `docs/db/tests/sync_completion_flags.sql` covering: status→completed flips is_complete, status away from completed flips is_complete=false, raw is_complete update flips status, both-side update preserves both.

**DB migration?** Yes — one function + one BEFORE trigger. Revertable.

**Out of scope:** dropping `is_complete` entirely (still used by `check_phase_unlock` downstream); any change to `check_phase_unlock` or `handle_phase_completion`; any change to the `TASK_STATUS` text domain values.

---

## Decisions locked in (confirmed during planning)

1. **Task 1 auto-assignment is DB-layer** (trigger), not app-layer — keeps the invariant even when an admin inserts a row via raw SQL.
2. **Task 2 is audit-only**, not behavior-changing — every policy callsite gets an inline intent comment, but no policy is rewritten yet. The shim buys us one release of runway.
3. **Task 3 keeps the existing app-layer mirror intact** — the trigger is a backstop, not a replacement; cascade/bubble-up logic in `updateStatus` stays.

---

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline 7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # ≥524 passing + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- **Task 1:** on a project with exactly one coach member, add a task → flip the "Coaching task" checkbox → save. Assignee should be the coach after the next refetch. Repeat with zero coaches (assignee stays null) and two coaches (assignee stays null).
- **Task 2:** `psql -c "\df public.check_project_*"` should show both `check_project_ownership` and `check_project_creatorship` with identical bodies. Every existing flow (login, create project, edit task, invite member) continues to work identically — the shim preserves behavior.
- **Task 3:** raw SQL `UPDATE public.tasks SET status = 'completed' WHERE id = <x>` → `is_complete` flips to `true` automatically. Symmetric for `UPDATE … SET is_complete = true` → `status` flips to `'completed'`. The phase-unlock chain still fires (proves `check_phase_unlock` still sees `is_complete = true` via the trigger's write order).

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT (read before touching business logic)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `docs/dev-notes.md` — source of Task 2 and Task 3 findings
- `docs/db/schema.sql` — SSoT for DB objects; mirror every migration here
- `docs/db/migrations/2026_04_17_coaching_task_rls.sql` — Wave 22 precedent for additive RLS migrations
- `supabase/functions/nightly-sync/index.ts` — reference for trigger-adjacent completion logic (`is_complete` vs `status` reads)
- `src/shared/api/planterClient.ts` (`Task.updateStatus`, ~line 470+) — cascade/bubble-up logic that must keep working after Task 3
- `src/features/tasks/lib/coaching-form.ts` — Wave 22 coaching normaliser; Task 1 reads it, does not rewrite it

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror three new migrations + Task 2 inline audit comments)
- `docs/architecture/tasks-subtasks.md` (coaching auto-assignment + completion-flag trigger notes)
- `docs/architecture/auth-rbac.md` (Task 2 audit sub-section)
- `docs/dev-notes.md` (flip two entries to resolved)
- `src/shared/api/planterClient.ts` (Task 3: trim redundant payload fields in `updateStatus`)
- `src/features/tasks/hooks/useTaskMutations.ts` (Task 1: refetch after coaching-flag flip; Task 3: optimistic cache still writes both flags)
- `src/features/tasks/lib/coaching-form.ts` (Task 1: JSDoc cross-reference to the trigger)
- `spec.md` (flip §6 Coach auto-assignment entry to shipped in §3.3 Coaching; bump to 1.9.1 or 1.10.0 per scope)
- `docs/AGENT_CONTEXT.md` (Wave 23 golden-path additions for auto-assignment + completion trigger)

**Will create:**
- `docs/db/migrations/2026_XX_XX_coaching_auto_assign.sql`
- `docs/db/migrations/2026_XX_XX_rename_project_creatorship.sql`
- `docs/db/migrations/2026_XX_XX_sync_task_completion.sql`
- `docs/db/tests/coaching_auto_assign.sql` (manual smoke)
- `docs/db/tests/sync_completion_flags.sql` (manual smoke)
- `Testing/unit/features/tasks/hooks/useTaskMutations.coachingRefetch.test.ts`
- `Testing/unit/shared/api/planterClient.updateStatus.syncflags.test.ts`

**Explicitly out of scope this wave:**
- Strategy Template half of §3.3 Specialized Task Types (still deferred)
- Topically-related library suggestions / recommender (still deferred)
- Collaboration Suite (threaded comments, activity log, realtime presence)
- Gantt chart, Checkpoint-based project type
- PWA / offline mode
- Localization
- Any RLS policy rewrite that flips creatorship to ownership (Task 2 is audit-only)
- Dropping `is_complete` entirely (phase-unlock trigger still reads it)
- Postgres-level test harness wiring into CI

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (use `date-engine`); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; keep `is_complete` and `status === 'completed'` in sync on any new status transitions (Task 3 makes this a DB invariant, but the app layer should still not deliberately desync); template vs instance clarified on any cross-cutting work (`origin = 'template' | 'instance'`); frontend/Deno recurrence + date helpers stay in lock-step; only add dependencies if truly necessary (motivate in the PR); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only unless the user explicitly approves a breaking change in-session.
