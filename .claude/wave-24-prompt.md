## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 23 shipped to `main` (user consolidated via direct push — the per-task PRs #149/#150/#151 were used for review only, not merged):
- `dfcf243 feat(wave-23): auto-assign coaching tasks to the project Coach`
- `09d7567 chore(wave-23): rename check_project_ownership → check_project_creatorship + audit callers`
- `0536a26 fix(wave-23): derive is_complete from status via trigger to prevent desync`
- `fbf3d66 fix(wave-23): address PR #149/#150/#151 review feedback`
- `46c820e docs(wave-23): post-merge documentation currency sweep`

Spec is at **1.9.1**. The "Coach auto-assignment on coaching-task creation" §6 carve-out is shipped; the "Dual completion signals" and "`check_project_ownership` latent auth bug" dev-notes entries are flipped (the former resolved outright, the latter renamed + audited but with a documented **behavior-change still deferred** follow-up — that follow-up is Task 1 of this wave).

**Gate baseline going into Wave 24: `npm run lint` → 0 errors (7 pre-existing warnings), `npm run build` clean, `npx vitest run` → 45 files / 529 tests passing.** Do not regress.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-24-rls-policy-rewrite`
- Task 2 → `claude/wave-24-strategy-template`
- Task 3 → `claude/wave-24-coach-backfill`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main` unless the user explicitly says to.

## Wave 24 scope

Three tasks, each scoped tight. One closes the Wave 23 audit follow-up (completes the creatorship/ownership cleanup). One closes the Wave 22 Coaching-counterpart §6 carve-out (Strategy Template). One is a small complementary extension of the Wave 23 coach auto-assignment trigger (retroactive backfill when membership changes). All three come with additive, revertable DB migrations where relevant.

---

### Task 1 — Wave 23 audit follow-up: rewrite `project_members` RLS + drop the `check_project_ownership` shim

**Commit:** `fix(wave-24): rewrite project_members RLS per Wave 23 audit + drop ownership shim`

Closes the "**Behavior-change still deferred**" half of the `check_project_ownership` dev-notes entry. Wave 23 named the problem and documented the per-policy intent in `docs/architecture/auth-rbac.md` (see the audit table). This wave executes that shopping list and drops the shim.

The audit outcomes to apply verbatim:

| Policy | Op | Wave 24 action |
| --- | --- | --- |
| `members_insert_policy` | INSERT | Replace `check_project_ownership(...)` with `check_project_creatorship(...)` directly (same semantics; name now matches intent). The bootstrap branch (creator self-inserts the initial `owner` row) stays. |
| `members_select_policy` | SELECT | **Delete** the `check_project_ownership(...)` clause entirely. `is_active_member(...)` OR `user_id = auth.uid()` already covers every legitimate read; the creatorship clause only fires for *removed* creators — the exact leak called out in dev-notes. |
| `members_delete_policy` | DELETE | Replace `check_project_ownership(...)` with a genuine ownership check: `EXISTS (SELECT 1 FROM public.project_members WHERE project_id = ... AND user_id = ... AND role = 'owner')`. Wrap in a new `public.check_project_ownership_by_role(pid, uid) RETURNS boolean` helper (STABLE, SECURITY DEFINER) so the four ownership callsites share one implementation. |
| `members_update_policy` | UPDATE | Same as DELETE — swap to `check_project_ownership_by_role(...)`. |

1. **DB migration** (`docs/db/migrations/2026_XX_XX_rewrite_project_members_policies.sql`, NEW)
   - `CREATE OR REPLACE FUNCTION public.check_project_ownership_by_role(pid uuid, uid uuid) RETURNS boolean` — STABLE, SECURITY DEFINER, `SET search_path TO ''`. Body queries `public.project_members WHERE project_id = pid AND user_id = uid AND role = 'owner'`. Add `REVOKE ALL ... FROM PUBLIC; GRANT ALL ... TO authenticated` (matches Wave 23 precedent).
   - `DROP POLICY` + `CREATE POLICY` for each of the four `project_members` policies with the new expressions per the table above.
   - `DROP FUNCTION public.check_project_ownership(uuid, uuid)` — the shim goes away. Search `src/**` and `supabase/**` first to confirm zero callers (Wave 23 confirmed it was DB-side only; verify once more before drop).
   - Mirror every new/removed/updated object into `docs/db/schema.sql` as the SSoT.

2. **Architecture doc** (`docs/architecture/auth-rbac.md`)
   - Replace the `### Creatorship vs. Ownership (Wave 23 audit)` sub-section with a `### Resolved (Wave 24)` entry pointing to the migration + commit. Keep a short table summarising the final state of each policy for future readers.

3. **Dev-notes cleanup** (`docs/dev-notes.md`)
   - Flip the `### \`check_project_ownership\` is a latent auth bug` entry from "Behavior-change still deferred" → fully resolved, pointing to Wave 24.

4. **Tests**
   - Manual `psql` smoke documented in the PR description: for each policy, `EXPLAIN` the new USING/WITH CHECK expression and assert it evaluates to the right value for (a) a current owner, (b) a removed former creator, (c) a non-member admin, (d) an active coach/editor/viewer.
   - No in-repo Postgres harness — same caveat as Wave 23.

**DB migration?** Yes — one new function + one DROP FUNCTION + four policy rewrites. Revertable via the header notes.

**Out of scope:** Any policy change outside `public.project_members`. Anything touching `check_project_creatorship` (which remains the correctly-named creatorship helper, still used by the INSERT policy).

---

### Task 2 — §6 carve-out: Strategy Template task type

**Commit:** `feat(wave-24): strategy template task type — prompt library follow-ups on completion`

Closes the "Strategy Template task type" entry in `spec.md` §6 Backlog. Mirrors the Coaching flow (Waves 22+23): a new flat boolean flag on `settings`, an owner/editor-gated checkbox in the task form, and a UI prompt wired into the status-completion transition. Scope is strictly the authoring + prompting UX — the underlying "add from Master Library" action is already shipped (`Task.clone`).

1. **Type + helpers** (`src/features/tasks/lib/strategy-form.ts`, NEW — mirrors `coaching-form.ts`)
   - `extractStrategyFlag(task)`, `formDataToStrategyFlag(data)`, `applyStrategyFlag(currentSettings, flag)` with the same contract (true/false/null, preserve other settings keys).
   - Extend `TaskSettings` in `src/shared/db/app.types.ts` with `is_strategy_template?: boolean`.

2. **UI — authoring** (`src/features/tasks/components/TaskFormFields.tsx`)
   - Add a "Strategy template" checkbox next to the existing "Coaching task" checkbox, gated to `membershipRole ∈ {owner, editor}` and `origin === 'instance'`. Form submits a flat `is_strategy_template` field.
   - Wire the normalisation in the same submit helpers that already handle coaching (reuse pattern; add one call to `applyStrategyFlag` alongside `applyCoachingFlag`).

3. **UI — completion prompt** (`src/features/tasks/components/TaskDetailsView.tsx` + new `StrategyFollowUpDialog.tsx`)
   - When `useUpdateTask` transitions a task flagged `is_strategy_template = true` from a non-completed status to `status === 'completed'`, open a Shadcn `Dialog` offering the Master Library combobox (reuse `useMasterLibrarySearch` + the existing "add from library" flow).
   - The user can select one or more templates; on confirm, clone each as a sibling (`parent_task_id = completed task's parent`) via the existing `Task.clone` path. Dismissal is first-class — the prompt is non-blocking.
   - Badge in `TaskDetailsView` ("Strategy Template") when `extractStrategyFlag(task)` is true, matching the "Coaching" badge visual.

4. **Architecture doc** (`docs/architecture/tasks-subtasks.md`)
   - Add a `## Strategy Templates (Wave 24)` section next to the existing `## Coaching Tasks (Wave 22)` section, documenting flag shape, authoring gate, and completion-prompt flow.

5. **Tests**
   - `Testing/unit/features/tasks/lib/strategy-form.test.ts` (NEW) — mirror `coaching-form.test.ts` (assuming it exists; if not, port its style from the Wave 22 test precedent). Cover `true`, `false`, `null` branches and preservation of other keys.
   - `Testing/unit/features/tasks/components/StrategyFollowUpDialog.test.tsx` (NEW) — smoke test that the dialog renders on the completion transition, lists templates, and calls `Task.clone` with the right payload on confirm.

**DB migration?** No. The flag rides on existing `settings` JSONB. No new RLS policy needed — owners/editors can already edit instance tasks.

**Out of scope:** any recommender scoring / "topically related" filtering in the library combobox (that's the remaining §6 carve-out, deferred). Template-side flagging of strategy origins (the flag lives on instance tasks only, consistent with the Coaching precedent).

---

### Task 3 — Coach backfill on membership change (Wave 23 extension)

**Commit:** `feat(wave-24): backfill coaching-task assignee when project coach membership changes`

Wave 23's `set_coaching_assignee` trigger auto-assigns a coaching task to the project's sole coach at INSERT/UPDATE time — but only for that specific row's write. If a project has coaching tasks with null `assignee_id` (e.g. the task was created before a coach joined, or when there were two coaches so the trigger no-op'd), and membership later changes such that exactly one coach is present, those tasks stay unassigned forever. Wave 24 closes that gap with an AFTER trigger on `public.project_members`.

1. **DB trigger** (`docs/db/migrations/2026_XX_XX_coaching_backfill_on_membership.sql`, NEW)
   - `CREATE FUNCTION public.backfill_coaching_assignees()` + `AFTER INSERT OR UPDATE OR DELETE ON public.project_members FOR EACH ROW`.
   - On every row change that could alter the coach count for a project, re-evaluate: if the project now has exactly one `coach`-role member, `UPDATE public.tasks SET assignee_id = <sole coach> WHERE root_id = <project_id> AND (settings ->> 'is_coaching_task')::bool IS TRUE AND assignee_id IS NULL AND origin = 'instance'`.
   - Zero or multiple coaches → no-op (never overwrites; never un-assigns).
   - Scoped to the affected project_id only (from NEW/OLD) to avoid project-wide fan-out on unrelated writes.
   - Mirror into `docs/db/schema.sql`.

2. **Architecture doc** (`docs/architecture/tasks-subtasks.md`)
   - Extend the `## Coaching Tasks (Wave 22)` → `Auto-assignment (Wave 23)` sub-bullet with a Wave 24 follow-up note describing the backfill trigger and the "exactly-one-coach on the project_members side" rule.

3. **Tests**
   - Manual `psql` smoke at `docs/db/tests/coaching_backfill_on_membership.sql` covering: project with two coaching tasks (null assignees) + zero coaches → add one coach → both tasks assigned; adding a second coach → no change (doesn't un-assign, doesn't overwrite); removing one of two coaches to land at exactly one → remaining coaching tasks with null assignees get assigned.
   - No new unit tests — the behaviour is DB-side and exercised by the smoke script.

**DB migration?** Yes — one additive AFTER trigger. Revertable.

**Out of scope:** Any retroactive change to `assignee_id` on tasks that *already* have a non-null value (user intent still wins). Any UI to surface "Newly assigned to you" toasts (deferred).

---

## Decisions locked in (confirmed during planning)

1. **Task 1 is behavior-changing** — unlike Wave 23's audit, this wave rewrites the policies. The `members_select_policy` change (deleting the creatorship branch) closes a real leak; the DELETE/UPDATE changes close the same leak. Manual `psql` smoke is required in the PR description to demonstrate the behaviour under the four personas listed.
2. **Task 2 does not need a DB migration** — the flag is a JSONB key mirrored from Coaching. If the Strategy Template flow grows a "Strategy Template" RLS carve-out later, that's a follow-up wave.
3. **Task 3 is additive** — the trigger never removes or changes an existing non-null `assignee_id`. All the guardrails from Wave 23 ("user intent wins") apply.

---

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline 7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # ≥529 passing + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- **Task 1:** `psql -c "\df public.check_project_*"` should show `check_project_creatorship` + `check_project_ownership_by_role`, with `check_project_ownership` GONE. A removed former creator who previously could delete `project_members` rows now cannot; an active `owner`-role member still can. Login / create project / invite member flows continue to work.
- **Task 2:** on an instance task, flip the "Strategy template" checkbox, save, then mark the task `completed`. The follow-up Dialog opens, lists Master Library templates, and on confirm clones the selected templates as siblings. Unflagging + completing should NOT open the dialog.
- **Task 3:** apply migration; manually set `assignee_id = NULL` on an existing coaching task on a zero-coach project; add one coach-role member to that project; the task's `assignee_id` populates to the new coach within the same transaction.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT (read before touching business logic)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `docs/dev-notes.md` — source of Task 1's follow-up scope
- `docs/db/schema.sql` — SSoT for DB objects; mirror every migration here
- `docs/db/migrations/2026_04_17_rename_project_creatorship.sql` — Wave 23 audit precedent (Task 1 completes this)
- `docs/db/migrations/2026_04_17_coaching_auto_assign.sql` — Wave 23 coaching trigger precedent (Task 3 extends this)
- `docs/db/migrations/2026_04_17_coaching_task_rls.sql` — Wave 22 RLS carve-out style reference
- `src/features/tasks/lib/coaching-form.ts` — helper pattern for Task 2's `strategy-form.ts`
- `src/features/tasks/components/TaskFormFields.tsx` (`membershipRole` gate, line ~29) — where the Strategy checkbox goes in Task 2
- `src/features/tasks/components/TaskDetailsView.tsx` — badge row + completion hook host for Task 2
- `src/features/tasks/hooks/useTaskMutations.ts` — `useUpdateTask` is where Task 2's completion-prompt hook integrates

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror three new migrations; drop shim; rewrite four policies)
- `docs/architecture/tasks-subtasks.md` (Strategy Templates section + coaching backfill sub-bullet)
- `docs/architecture/auth-rbac.md` (flip Wave 23 audit → Wave 24 resolved)
- `docs/dev-notes.md` (flip `check_project_ownership` entry to fully resolved)
- `src/shared/db/app.types.ts` (add `is_strategy_template` to `TaskSettings`)
- `src/features/tasks/components/TaskFormFields.tsx` (add Strategy checkbox)
- `src/features/tasks/components/TaskDetailsView.tsx` (Strategy badge + completion-prompt integration)
- `src/features/tasks/hooks/useTaskMutations.ts` (optional: surface strategy-template completion event if the prompt is driven from the mutation hook)
- `spec.md` (flip §6 Strategy Template to shipped; bump version — 1.10.0 if the scope feels wave-sized, else 1.9.2)
- `docs/AGENT_CONTEXT.md` (Wave 24 golden-path additions)
- `repo-context.yaml` (Wave 24 header + `wave_24_highlights` block)

**Will create:**
- `docs/db/migrations/2026_XX_XX_rewrite_project_members_policies.sql`
- `docs/db/migrations/2026_XX_XX_coaching_backfill_on_membership.sql`
- `docs/db/tests/coaching_backfill_on_membership.sql` (manual smoke)
- `src/features/tasks/lib/strategy-form.ts`
- `src/features/tasks/components/StrategyFollowUpDialog.tsx`
- `Testing/unit/features/tasks/lib/strategy-form.test.ts`
- `Testing/unit/features/tasks/components/StrategyFollowUpDialog.test.tsx`

**Explicitly out of scope this wave:**
- Topically-related library suggestions / recommender (still deferred — the remaining §3.5 half)
- Collaboration Suite (threaded comments, activity log, realtime presence)
- Gantt chart, Checkpoint-based project type
- PWA / offline mode
- Localization
- Any task-type discriminator column on `public.tasks` (dev-notes item, still deferred — significant cross-cutting change that needs its own wave)
- Postgres-level test harness wiring into CI

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (use `date-engine`); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; `is_complete === (status === 'completed')` is a DB-level invariant — never deliberately desync in the app layer; template vs instance clarified on any cross-cutting work (`origin = 'template' | 'instance'`); frontend/Deno recurrence + date helpers stay in lock-step; only add dependencies if truly necessary (motivate in the PR); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only unless the user explicitly approves a breaking change in-session (Task 1's `DROP FUNCTION` is pre-approved here since the audit and shim-runway window were documented in Wave 23).
