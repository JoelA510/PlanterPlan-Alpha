## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 28 shipped to `main`:
- Gantt chart at `/gantt?projectId=:id` (lazy-loaded, `gantt-task-react@0.3.9` pinned)
- `tasksToGanttRows` adapter + `useGanttDragShift` (parent-bounds enforcement, `useUpdateTask` cascade reuse)

Spec is at **1.13.0**. Outstanding: §3.2 Checkpoint + §3.2 Advanced Access (this wave), §3.7 platform features (Waves 30+), §3.8 mobile (Wave 32), §3.1 localization (Wave 31), Wave 37 doc-gap closures.

Wave 29 ships **two related items**: Checkpoint-Based Architecture for §3.2 (alternate project type) and the long-deferred §3.2 Advanced Access (Phase Lead) backlog item — they pair naturally because both reshape per-phase access semantics. Closes the `dashboard-analytics.md` "Donut Charts for Checkpoint-based project phases" gap.

**Test baseline going into Wave 29:** Wave 28 shipped at ≥600 tests. Run `npm test` and record. Lint baseline: 0 errors, ≤7 warnings — do not regress.

## Pre-flight verification (run before any task)

1. `git log --oneline -5` includes the 2 Wave 28 commits.
2. These files exist:
   - `src/features/projects/components/EditProjectModal.tsx`
   - `src/features/projects/components/PhaseCard.tsx`
   - `src/features/projects/components/ProjectHeader.tsx` (donut chart precedent — `recharts` `<PieChart>`; grep to confirm)
   - `src/features/tasks/components/TaskList.tsx`
   - `src/features/tasks/components/TaskFormFields.tsx`
   - `src/features/tasks/components/TaskDetailsView.tsx`
   - `src/features/tasks/lib/coaching-form.ts` (helper-trio precedent)
   - `src/features/tasks/lib/strategy-form.ts` (helper-trio precedent)
   - `src/shared/lib/date-engine/index.ts`
   - `supabase/functions/_shared/date.ts` (Deno mirror site)
   - `supabase/functions/nightly-sync/index.ts` (urgency transition pass)
   - `src/shared/db/app.types.ts` (extend `TaskSettings`)
   - `src/shared/ui/radio-group.tsx`
   - `src/shared/ui/dialog.tsx`
   - `docs/architecture/projects-phases.md`, `auth-rbac.md`, `date-engine.md`, `dashboard-analytics.md`
3. Schema fact-check:
   - `tasks.is_locked` (boolean, default false) and `tasks.prerequisite_phase_id` (uuid, FK to tasks) exist — verify in `docs/db/schema.sql`. **These already exist; Wave 29 does not add them.**
   - Existing triggers `check_phase_unlock` (AFTER UPDATE OF is_complete) and `handle_phase_completion` (AFTER UPDATE OF status) handle phase unlocking. **Wave 29 does NOT modify these.**
   - `tasks.task_type` exists (Wave 25); `task_type IN ('phase','milestone')` is the gate for the Phase Lead picker.
4. Project-members fetching — the codebase exposes project members via `useTeam` in `src/features/people/hooks/useTeam.ts`. Confirm by reading the file. If `useTeam` returns members of a given project, reuse it. If not, add a lookup via `planter.entities.TeamMember.filter({ project_id: ... })` (the entity exists per the planterClient inventory).
5. `RecurrenceRule` is the lock-step pattern: `src/shared/lib/recurrence.ts` ↔ `supabase/functions/_shared/recurrence.ts`. Wave 29's `isCheckpointProject` follows the same lock-step convention.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-29-checkpoint-projects`
- Task 2 → `claude/wave-29-phase-lead`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 29 scope

Two tasks. Task 1 is heavier (project kind discriminator, date-engine carve-out, donut UI). Task 2 is a tighter additive RLS + UI change.

---

### Task 1 — Checkpoint-based project type

**Commit:** `feat(wave-29): checkpoint project kind + sequential phase unlock + donut visualization`

A new "kind" of project that drops the rigid date model in favor of sequential phase gating. The DB-level unlock (`check_phase_unlock`) already does the work; this wave wires the project-level "kind" toggle, the date-engine carve-out, the donut UI, and the kind-switch reversal UX.

**Convention (locked, no alternatives):** Store on the **root task's** `settings` JSONB as `settings.project_kind: 'date' | 'checkpoint'` (defaults to `'date'` when absent — every existing project's behavior). No new column — follows the `settings.published`, `settings.recurrence`, `settings.is_coaching_task` precedent.

**Migration**: `docs/db/migrations/2026_04_18_project_kind.sql` (NEW). Use this DDL:

```sql
-- Migration: Wave 29 — project_kind (checkpoint vs date) discriminator on root tasks
-- Date: 2026-04-18
-- Description:
--   Adds an additive CHECK constraint that gates settings->>'project_kind' to the
--   two-value vocabulary on root tasks (parent_task_id IS NULL). Non-root tasks
--   are unaffected. Absence of the key (the default for every existing project)
--   means 'date' — backfill is a no-op, no UPDATE statement.
--
--   The kind toggle lives in EditProjectModal; the date-engine and nightly-sync
--   short-circuit checkpoint projects (see src/shared/lib/date-engine/index.ts
--   and supabase/functions/nightly-sync/index.ts).
--
-- Revert path:
--   ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_kind_check;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_project_kind_check CHECK (
  parent_task_id IS NOT NULL
  OR settings ->> 'project_kind' IS NULL
  OR settings ->> 'project_kind' IN ('date','checkpoint')
);
```

Mirror into `docs/db/schema.sql`.

**Domain types** — extend `TaskSettings` in `src/shared/db/app.types.ts`:

```ts
// Wave 29: project kind for root tasks
project_kind?: 'date' | 'checkpoint';
// Wave 29: phase-lead designation on phase/milestone rows (Task 2)
phase_lead_user_ids?: string[];
```

**Helper trio** — `src/features/projects/lib/project-kind.ts` (NEW), mirrors the coaching/strategy precedent:

```ts
import type { TaskRow } from '@/shared/db/app.types';

export type ProjectKind = 'date' | 'checkpoint';

/**
 * Reads settings.project_kind from a root task; defaults to 'date'.
 * Safe on null/undefined and missing keys.
 */
export function extractProjectKind(rootTask: Pick<TaskRow, 'settings'> | null | undefined): ProjectKind {
  const settings = (rootTask?.settings ?? {}) as Record<string, unknown>;
  const raw = settings.project_kind;
  return raw === 'checkpoint' ? 'checkpoint' : 'date';
}

/**
 * Normalises a form's `project_kind` field into the settings shape.
 * Returns null when the form did not include the field (no change).
 */
export function formDataToProjectKind(data: { project_kind?: ProjectKind }): ProjectKind | null {
  if (data.project_kind === 'checkpoint' || data.project_kind === 'date') return data.project_kind;
  return null;
}

/**
 * Merges a project_kind into the existing settings JSONB. Preserves all other keys.
 * Pass `null` to leave settings untouched.
 */
export function applyProjectKind(
  currentSettings: Record<string, unknown> | null | undefined,
  kind: ProjectKind | null,
): Record<string, unknown> | undefined {
  if (kind === null) return currentSettings ?? undefined;
  return { ...(currentSettings ?? {}), project_kind: kind };
}
```

**Date Engine carve-out** — `src/shared/lib/date-engine/index.ts`. Add this exported helper:

```ts
/**
 * True when the task's settings indicate a checkpoint project. Safe on
 * non-root tasks (always false). Defaults to date-driven when the key is absent.
 *
 * MUST stay byte-equivalent with the Deno mirror at
 * `supabase/functions/_shared/date.ts`. Lock-step convention per Wave 21
 * recurrence helpers.
 */
export function isCheckpointProject(rootTask: { parent_task_id?: string | null; settings?: Record<string, unknown> | null } | null | undefined): boolean {
  if (!rootTask) return false;
  if (rootTask.parent_task_id) return false; // not a root
  const kind = (rootTask.settings ?? {})['project_kind'];
  return kind === 'checkpoint';
}
```

Then modify the existing `recalculateProjectDates` to early-return `[]` when called with a checkpoint root:

```ts
// Pseudocode: at the top of recalculateProjectDates(projectTasks, newStart, oldStart):
const root = projectTasks.find((t) => !t.parent_task_id);
if (isCheckpointProject(root)) return []; // checkpoint projects don't bulk-shift
```

And modify `deriveUrgency` to accept an optional `rootTask` and short-circuit:

```ts
// New optional param: if provided AND isCheckpointProject(rootTask), return 'not_yet_due' for any non-completed task.
// Backward-compatible: if rootTask omitted, behavior unchanged.
```

For minimal-diff safety, **don't** widen the existing `deriveUrgency` signature. Instead add a new helper `deriveUrgencyForProject(task, rootTask, threshold, now)` that wraps `deriveUrgency` with the checkpoint check. Existing call sites stay; new gantt/nightly-sync sites use the wrapped version.

**Deno mirror** — `supabase/functions/_shared/date.ts`. Append a byte-equivalent `isCheckpointProject` (no React imports). Header comment: `// Lock-step with src/shared/lib/date-engine/index.ts → isCheckpointProject. Update both together.`

**Nightly-sync carve-out** — `supabase/functions/nightly-sync/index.ts`. In the urgency-transition passes (overdue + due_soon), look up each task's project root and skip when `isCheckpointProject(root)`. Recurrence pass is unaffected.

```ts
// Pseudocode:
// Before INSERTing the status update for a task, fetch the task's root_id, look up the root's
// settings, and call isCheckpointProject(root). Skip the update if true.
//
// Implementation: load all roots for the affected projects in one query and build a Set<string>
// of checkpoint project IDs once per invocation. Then filter the per-task update list.
```

**Edit Project modal** — `src/features/projects/components/EditProjectModal.tsx`. Add a `<RadioGroup>` (from `src/shared/ui/radio-group.tsx`):

```tsx
<RadioGroup value={projectKind} onValueChange={setProjectKind}>
  <RadioGroupItem value="date" id="kind-date" />
  <Label htmlFor="kind-date">Date-driven (default)</Label>
  <RadioGroupItem value="checkpoint" id="kind-checkpoint" />
  <Label htmlFor="kind-checkpoint">Checkpoint-based</Label>
</RadioGroup>
```

**Switching `date` → `checkpoint`** is direct (no confirmation needed; date data is preserved; the date-engine just stops shifting it).

**Switching `checkpoint` → `date`** **REQUIRES** a Shadcn `<AlertDialog>` confirmation (use `<Dialog>` from `src/shared/ui/dialog.tsx` with destructive-secondary button styling — confirm `<AlertDialog>` is not in the codebase; if not, use `<Dialog>` with manual button setup). Copy:

> **Switch back to date-driven scheduling?**
> Existing due dates will become active again. Tasks that are past due will appear as overdue. Locked phases stay locked until you toggle `is_locked` directly.
> [Cancel] [Switch to date-driven]

On confirm: call `useUpdateProject` with `{ settings: applyProjectKind(currentSettings, 'date') }`.

**Phase-lock UX** — `src/features/projects/components/PhaseCard.tsx`. When `extractProjectKind(rootTask) === 'checkpoint'` AND `phase.is_locked === true`:
* Render a `<Lock>` icon (from `lucide-react`, already in the project) on the phase row.
* The phase's tasks render with `text-slate-400` and the status checkbox is `disabled`.

When `is_locked` flips to `false` (via the existing `check_phase_unlock` trigger when the prerequisite phase completes), the realtime channel in `Project.tsx` fires a refetch and the lock icon disappears + tasks become interactive.

**Donut visualization** — also `PhaseCard.tsx`. When `extractProjectKind(rootTask) === 'checkpoint'`:
* Replace the existing progress bar with a donut chart (reuse the recharts `<PieChart>` pattern from `ProjectHeader.tsx` — grep for `<PieChart` in `ProjectHeader.tsx` to find the exact shape).
* Donut: `completed_count` vs `total_count` of tasks under the phase. Color: brand-600 fill, slate-200 track.
* Center label: `{percentage}%` when not locked; `Locked` when `is_locked === true`.

When project kind is `'date'`, keep the existing progress bar.

Closes the `dashboard-analytics.md` "Donut Charts for Checkpoint-based project phases" gap (close in the docs sweep).

**Architecture doc** — expand the existing "Alternate Architecture: Checkpoint-Based Projects" section in `docs/architecture/projects-phases.md`:

```md
### Checkpoint-Based Projects (Wave 29 — Implementation Complete)

**Discriminator**: `settings.project_kind: 'date' | 'checkpoint'` on root tasks (defaults to `'date'` when absent). CHECK constraint `tasks_project_kind_check` enforces the two-value vocabulary; absence-as-date keeps existing projects un-migrated.

**Helpers**: `src/features/projects/lib/project-kind.ts` mirrors the coaching/strategy form-helper trio (`extractProjectKind`, `formDataToProjectKind`, `applyProjectKind`). Migration: `docs/db/migrations/2026_04_18_project_kind.sql`.

**Date-engine carve-out**: `recalculateProjectDates` short-circuits when the root is checkpoint (no bulk-shift). `deriveUrgencyForProject` returns `'not_yet_due'` for any non-completed checkpoint task. `isCheckpointProject` is mirrored byte-equivalent in `supabase/functions/_shared/date.ts` (lock-step).

**Nightly-sync**: the urgency-transition passes skip checkpoint projects. The recurrence pass is unaffected (templates are project-kind-agnostic).

**Phase unlock**: existing `check_phase_unlock` trigger and `is_locked`/`prerequisite_phase_id` columns do all the unlocking work — Wave 29 changes nothing about the trigger. The new bit is the project-kind gating in the UI: locked phases visually communicate the lock state in checkpoint projects only.

**Kind switching**: `date → checkpoint` is direct. `checkpoint → date` requires an `<AlertDialog>` confirmation in `EditProjectModal`. Date data is preserved across switches (no destructive operation).

**Donut visualization**: `PhaseCard.tsx` swaps its progress bar for a `<PieChart>` (same pattern as `ProjectHeader.tsx`) when the project is checkpoint. Center label is `{percentage}%` or `Locked`.
```

**Cross-doc updates**:
* `docs/architecture/date-engine.md` — append to "Business Rules & Constraints": `* **Checkpoint projects (Wave 29)**: `recalculateProjectDates` and `deriveUrgencyForProject` short-circuit; nightly-sync skips urgency transitions; due dates render as informational only.`
* `docs/architecture/dashboard-analytics.md` — flip the "Donut Charts for Checkpoint-based project phases" gap to **Resolved (Wave 29)**.

**Tests**:
* `Testing/unit/features/projects/lib/project-kind.test.ts` (NEW) — extract/apply/formDataTo trio, mirror `coaching-form.test.ts`. Cases: absent key → `'date'`; explicit `'checkpoint'`; explicit `'date'`; invalid value → `'date'`; preservation of other settings keys.
* `Testing/unit/shared/lib/date-engine/checkpoint.test.ts` (NEW) — `isCheckpointProject(null)` → false; non-root with checkpoint kind → false; root with checkpoint → true; root without kind key → false; `recalculateProjectDates` returns `[]` for checkpoint root.
* `Testing/unit/features/projects/components/EditProjectModal.kind.test.tsx` (NEW) — radio renders; checkpoint→date triggers AlertDialog; submit fires expected payload via `useUpdateProject`.
* `Testing/unit/features/projects/components/PhaseCard.donut.test.tsx` (NEW) — bar renders for date; donut renders for checkpoint; locked phase shows "Locked" label.
* Manual `psql` smoke at `docs/db/tests/checkpoint_kind.sql` — assert constraint accepts `null`, `'date'`, `'checkpoint'`; rejects `'foo'`. Header: `-- EXPECT: 3 inserts succeed, 1 insert raises constraint violation`.

**DB migration?** Yes — one CHECK constraint, additive, revertable.

**Out of scope:** Auto-classifying existing projects as checkpoint (default-`'date'` is correct; users opt in). Cross-phase prerequisite chain editor UI (the column exists; setting it via UI is deferred). Fancy unlock animations.

---

### Task 2 — Advanced Access (Phase Lead)

**Commit:** `feat(wave-29): assign limited viewer as Phase Lead with scoped UPDATE policy`

Closes the `[-]` "Advanced Access: Assign Phase/Milestone to a limited viewer" backlog item from §3.2. A Project Owner may assign a `viewer`-role member as the Lead of a specific phase or milestone; that member may then edit tasks under that phase/milestone (but no other phases). Mirrors the Coaching pattern (Waves 22/23): additive RLS + UI affordance — but scoped by hierarchy ancestry instead of a per-task flag.

**Convention (locked):** Store assignments on the phase or milestone row's `settings` JSONB as `settings.phase_lead_user_ids: string[]` (a list to allow multiple leads in a phase). Already added to `TaskSettings` in Task 1.

**RLS migration** — `docs/db/migrations/2026_04_18_phase_lead_rls.sql` (NEW):

```sql
-- Migration: Wave 29 — Phase Lead RLS for limited viewers
-- Date: 2026-04-18
-- Description:
--   Adds `user_is_phase_lead(target_task_id uuid, uid uuid)` SECURITY DEFINER
--   helper that walks up the parent_task_id chain looking for any ancestor whose
--   `settings -> 'phase_lead_user_ids'` contains uid. Adds an additive RLS UPDATE
--   policy on public.tasks letting users update tasks under any phase/milestone
--   they're a Phase Lead for. Mirrors the Wave 22 coaching policy precedent.
--
--   No SELECT change — viewers already have project-wide SELECT.
--
-- Revert path:
--   DROP POLICY IF EXISTS "Enable update for phase leads" ON public.tasks;
--   DROP FUNCTION IF EXISTS public.user_is_phase_lead(uuid, uuid);

CREATE OR REPLACE FUNCTION public.user_is_phase_lead(target_task_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_task_id, settings
    FROM public.tasks
    WHERE id = target_task_id
    UNION ALL
    SELECT t.id, t.parent_task_id, t.settings
    FROM public.tasks t
    JOIN ancestors a ON t.id = a.parent_task_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM ancestors
    WHERE settings ? 'phase_lead_user_ids'
      AND (settings -> 'phase_lead_user_ids') ? uid::text
  );
$$;

REVOKE ALL ON FUNCTION public.user_is_phase_lead(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_phase_lead(uuid, uuid) TO authenticated;

CREATE POLICY "Enable update for phase leads"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  origin = 'instance'
  AND public.user_is_phase_lead(id, auth.uid())
)
WITH CHECK (
  origin = 'instance'
  AND public.user_is_phase_lead(id, auth.uid())
);
```

Mirror into `docs/db/schema.sql`.

**Helper trio** — `src/features/projects/lib/phase-lead.ts` (NEW):

```ts
import type { TaskRow } from '@/shared/db/app.types';

export function extractPhaseLeads(task: Pick<TaskRow, 'settings'> | null | undefined): string[] {
  const settings = (task?.settings ?? {}) as Record<string, unknown>;
  const raw = settings.phase_lead_user_ids;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

export function applyPhaseLeads(
  currentSettings: Record<string, unknown> | null | undefined,
  userIds: string[],
): Record<string, unknown> {
  const dedup = [...new Set(userIds)];
  return { ...(currentSettings ?? {}), phase_lead_user_ids: dedup };
}
```

(No `formDataToPhaseLeads` needed — the form passes the array directly.)

**UI — Phase Lead picker** — `src/features/tasks/components/TaskFormFields.tsx`. When `task.task_type IN ('phase','milestone')` AND `membershipRole === 'owner'`:
* Render a multi-select using `<Select>` with `multiple` (Shadcn `<Select>` doesn't support multi-select natively — implement as a list of checkboxes rendered inside a `<Popover>`, or use a `<Command>` with multi-pick).
* **Default implementation (locked)**: use `<Command>` from `src/shared/ui/command.tsx` rendered inside a `<Popover>` with manual checkbox state. Each item is one project member with role `viewer` or `limited` (filter from `useTeam(projectId)` results — owners/editors already have project-wide UPDATE, no need to designate them as Phase Lead).
* The form field name is `phase_lead_user_ids: string[]` (added to `TaskFormData` in `app.types.ts`).
* On submit, the existing submit-merge in `TaskList.tsx` (or wherever `TaskFormFields` submits — read the file to confirm) calls `applyPhaseLeads(currentSettings, formData.phase_lead_user_ids)` after `applyCoachingFlag` / `applyStrategyTemplateFlag`.

Owners/editors/coaches/admins are NOT in the picker (the policy carve-out doesn't apply to them — they have full UPDATE via existing policies).

**Badge** — `src/features/tasks/components/TaskDetailsView.tsx`. When `extractPhaseLeads(task).length > 0`, render a "Phase Leads: @user1, @user2" badge row. Use a purple variant (distinct from the sky-coaching and emerald-strategy badges). To resolve user_id → email, use `useTeam(projectId)` and look up by id.

**Architecture doc** — append to `docs/architecture/auth-rbac.md`:

```md
### Phase Lead (Wave 29)

A project Owner may designate any `viewer` or `limited`-role member as the **Lead** of a specific phase or milestone via `settings.phase_lead_user_ids` (a JSONB array on the phase/milestone row). The list allows multiple leads per phase; a single user can lead multiple phases.

**RLS** (migration `docs/db/migrations/2026_04_18_phase_lead_rls.sql`):
* Helper: `user_is_phase_lead(target_task_id uuid, uid uuid)` walks up the `parent_task_id` chain and returns true if any ancestor's `settings.phase_lead_user_ids` contains `uid`.
* Policy: `"Enable update for phase leads"` on `public.tasks` — `USING (origin = 'instance' AND user_is_phase_lead(id, auth.uid()))`.
* **Additive only** — owner/editor/coach UPDATE policies are unchanged. SELECT for viewers is unchanged (already project-wide).

**UI** (`src/features/tasks/components/TaskFormFields.tsx`): a multi-select picker on phase/milestone rows, gated to `membershipRole === 'owner'`. Sources options from `useTeam(projectId).teamMembers.filter(m => m.role === 'viewer' || m.role === 'limited')` — note the hook field is `teamMembers`, not `members`. Badge in `TaskDetailsView.tsx` lists current leads.

**Permission matrix update**: limited viewers may now edit tasks under any phase/milestone they are designated as Phase Lead for. See the matrix at the top of this file (footnote added).
```

**Permission matrix footnote** — append to the existing "Project Role Permission Matrix" table in `auth-rbac.md`:

```md
> **Footnote (Wave 29):** Viewer/Limited users may also edit tasks under any phase or milestone they are designated as Phase Lead for. See "Phase Lead" section below.
```

**Tests**:
* `Testing/unit/features/projects/lib/phase-lead.test.ts` (NEW) — extract/apply with dedup; settings preservation; type guard against non-string array elements.
* `Testing/unit/features/tasks/components/TaskFormFields.phaseLead.test.tsx` (NEW) — picker visible only for owners on phase/milestone rows; hidden on leaf tasks; hidden for editor/coach/viewer roles; submit payload includes `phase_lead_user_ids`.
* Manual `psql` smoke at `docs/db/tests/phase_lead_rls.sql` (NEW). Cases:
  * Insert a milestone with `settings.phase_lead_user_ids = [<viewer_user_id>]`.
  * As that viewer, attempt to UPDATE a task under that milestone → succeeds.
  * As same viewer, attempt to UPDATE a task under a sibling milestone (no Phase Lead) → fails with RLS denial.
  * As the same viewer, attempt to UPDATE the milestone row itself → fails (the policy gates `tasks` updates under the phase, not the phase row itself; that requires owner/editor).
  * Header: `-- EXPECT: viewer-with-phase-lead can update child task; cannot update sibling phase's child; cannot update phase row`.

**DB migration?** Yes — one helper function + one additive RLS policy.

**Out of scope:** Owner/editor in the picker (already have UPDATE). Per-task lead designation finer than phase/milestone (defer). Notification when assigned as Phase Lead (Wave 30).

---

## Documentation Currency Pass (mandatory — before review)

`docs(wave-29): documentation currency sweep`. Operations:

1. **`spec.md`**:
   - §3.2: flip `[ ] **Checkpoint-Based Architecture** ...` → `[x]` with sub-note pointing to `settings.project_kind` + `docs/architecture/projects-phases.md`.
   - §3.2: promote `[-] **Advanced Access** ...` from Backlog to `[x]` shipped with the Phase Lead pointer.
   - Bump header to `> **Version**: 1.14.0 (Wave 29 — Checkpoint Projects + Phase Lead)`. Update `Last Updated`.

2. **`docs/AGENT_CONTEXT.md`** — add two golden-path bullets:
   - `**Checkpoint Project Kind (Wave 29)**: `settings.project_kind` on root tasks; helpers in `src/features/projects/lib/project-kind.ts`; `isCheckpointProject` in `date-engine` (lock-step with `supabase/functions/_shared/date.ts`); UI gates `<RadioGroup>` in `EditProjectModal` with `<AlertDialog>` confirmation on switch back to date.`
   - `**Phase Lead (Wave 29)**: `settings.phase_lead_user_ids[]` on phase/milestone rows; `user_is_phase_lead` recursive ancestor-walk function + additive RLS UPDATE policy; multi-select picker in `TaskFormFields` for owners only; viewer/limited members in the options.`

3. **`docs/architecture/projects-phases.md`** — Checkpoint section is the SSoT.

4. **`docs/architecture/auth-rbac.md`** — Phase Lead section + matrix footnote in.

5. **`docs/architecture/date-engine.md`** — Business Rules bullet in.

6. **`docs/architecture/dashboard-analytics.md`** — Checkpoint donut gap → Resolved.

7. **`docs/architecture/tasks-subtasks.md`** — append one-line cross-ref under wave-tagged sections: `**Phase Lead (Wave 29):** `settings.phase_lead_user_ids[]` on phase/milestone rows is consumed by the additive RLS UPDATE policy `"Enable update for phase leads"`. See `auth-rbac.md` for the policy text and `src/features/projects/lib/phase-lead.ts` for the form helpers.`

8. **`docs/dev-notes.md`** — confirm currency. No new entries.

9. **`repo-context.yaml`**:
   - `wave_status.current: 'Wave 29 (Checkpoint Projects + Phase Lead)'`, `last_completed: 'Wave 29'`, `spec_version: '1.14.0'`.
   - `wave_29_highlights:` list: `settings.project_kind` discriminator, `isCheckpointProject` lock-step, donut viz on PhaseCard, `user_is_phase_lead` RLS, phase-lead picker in TaskFormFields.

10. **`CLAUDE.md`**:
    - Schema Overview: under `tasks` settings JSONB notes, append `project_kind ('date' | 'checkpoint'), phase_lead_user_ids (string[])` to the canonical settings keys list.
    - Add a one-liner under "Schema Overview → tasks": `**Wave 29:** `settings.project_kind` gates the date-engine; `settings.phase_lead_user_ids` widens UPDATE access via the `"Enable update for phase leads"` RLS policy.`

Land docs as `docs(wave-29): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Kind switch reversibility** — flip a project to checkpoint, complete phase 1's tasks, see phase 2 unlock via the existing trigger. Flip back to date — confirmation dialog appears; submit; due dates re-engage. Flip to checkpoint again. The whole cycle should be lossless.
2. **Date-engine quietness on checkpoint projects** — open the dev console while interacting with a checkpoint project. The nightly-sync function logs (visible via `supabase functions serve nightly-sync` locally) should report 0 urgency transitions for that project's tasks.
3. **Phase Lead RLS** — manual `psql` smoke per Task 2; **also** sign in as the assigned phase lead in the dev UI and confirm the per-task status checkbox is enabled on assigned-phase tasks and disabled on others.
4. **Donut renders correctly** — date-kind project shows progress bar; checkpoint shows donut; locked checkpoint phase shows "Locked" center label.
5. **Lock-step Deno mirror** — `supabase/functions/_shared/date.ts` carries `isCheckpointProject` byte-equivalent. Eyeball-diff the two functions.
6. **No FSD drift** — `features/projects/lib/project-kind.ts` and `features/projects/lib/phase-lead.ts` mirror the coaching-form precedent. No barrel files. No new dependencies.
7. **Type drift** — `database.types.ts` did not change (no new column); verify no accidental touch.
8. **Lint + build + tests** — green.

## Commit & Push to Main (mandatory — gates Wave 30)

After both task PRs and the docs sweep merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npm test`.
2. The new commits: 2 task commits + 1 docs sweep on top of Wave 28.
3. `git push origin main`. CI green.
4. **Do not start Wave 30** until the above is true.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors, ≤7 warnings
npm run build     # clean
npm test          # baseline + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- **Task 1:** create a project → Edit → flip to Checkpoint → see lock icons on phases 2+. Mark phase 1 tasks complete one by one → donut fills; at 100%, phase 2 unlocks via the existing `check_phase_unlock` trigger; realtime channel updates the lock icon. Flip back to Date → AlertDialog → submit → due dates resume rendering, donuts revert to bars.
- **Task 2:** as Owner, assign a `viewer`-role member as Phase Lead on a milestone (multi-select in TaskFormFields). Sign in as that member → confirm the milestone's tasks are editable, sibling milestones are read-only, the milestone row itself is NOT editable. Sign in as a viewer with no Phase Lead → confirm everything is read-only.

## Key references

- `CLAUDE.md` — conventions
- `.gemini/styleguide.md` — strict typing, FSD, Tailwind, optimistic-rollback
- `docs/architecture/projects-phases.md` — host doc for Task 1
- `docs/architecture/auth-rbac.md` — host doc for Task 2; existing helper definitions
- `docs/architecture/date-engine.md` — Business Rules update
- `docs/architecture/dashboard-analytics.md` — donut gap closes
- `docs/db/migrations/2026_04_17_coaching_task_rls.sql` — additive UPDATE policy precedent
- `src/features/tasks/lib/coaching-form.ts` — helper-trio template for both new helpers
- `src/features/tasks/lib/strategy-form.ts` — helper-trio template
- `src/features/projects/components/ProjectHeader.tsx` — recharts `<PieChart>` precedent for the donut swap
- `supabase/functions/_shared/date.ts` — Deno mirror site
- `supabase/functions/_shared/recurrence.ts` — lock-step convention precedent

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror Tasks 1 + 2 migrations)
- `docs/architecture/projects-phases.md` (Checkpoint SSoT)
- `docs/architecture/auth-rbac.md` (Phase Lead section + matrix footnote)
- `docs/architecture/date-engine.md` (Checkpoint carve-out bullet)
- `docs/architecture/dashboard-analytics.md` (donut gap → Resolved)
- `docs/architecture/tasks-subtasks.md` (Phase Lead one-line cross-ref)
- `docs/AGENT_CONTEXT.md` (two Wave 29 golden-path bullets)
- `docs/dev-notes.md` (currency check)
- `src/shared/db/app.types.ts` (`TaskSettings.project_kind`, `TaskSettings.phase_lead_user_ids`, `TaskFormData.phase_lead_user_ids`)
- `src/shared/lib/date-engine/index.ts` (`isCheckpointProject`, carve-outs in `recalculateProjectDates` and a new `deriveUrgencyForProject`)
- `src/features/projects/components/EditProjectModal.tsx` (kind picker + reversal AlertDialog)
- `src/features/projects/components/PhaseCard.tsx` (donut/bar swap + lock UX)
- `src/features/tasks/components/TaskList.tsx` (submit-merge for phase leads alongside coaching/strategy)
- `src/features/tasks/components/TaskFormFields.tsx` (Phase Leads multi-select picker)
- `src/features/tasks/components/TaskDetailsView.tsx` (Phase Leads badge row)
- `supabase/functions/_shared/date.ts` (Deno mirror of `isCheckpointProject`)
- `supabase/functions/nightly-sync/index.ts` (skip checkpoint projects in urgency passes)
- `spec.md` (flip §3.2 Checkpoint + §3.2 Advanced Access, bump to 1.14.0)
- `repo-context.yaml` (Wave 29 highlights)
- `CLAUDE.md` (settings keys note)

**Will create:**
- `docs/db/migrations/2026_04_18_project_kind.sql`
- `docs/db/migrations/2026_04_18_phase_lead_rls.sql`
- `docs/db/tests/checkpoint_kind.sql`
- `docs/db/tests/phase_lead_rls.sql`
- `src/features/projects/lib/project-kind.ts`
- `src/features/projects/lib/phase-lead.ts`
- `Testing/unit/features/projects/lib/project-kind.test.ts`
- `Testing/unit/features/projects/lib/phase-lead.test.ts`
- `Testing/unit/shared/lib/date-engine/checkpoint.test.ts`
- `Testing/unit/features/projects/components/EditProjectModal.kind.test.tsx`
- `Testing/unit/features/projects/components/PhaseCard.donut.test.tsx`
- `Testing/unit/features/tasks/components/TaskFormFields.phaseLead.test.tsx`

**Explicitly out of scope this wave:**
- Project-kind auto-detection
- Bulk-flip multiple projects via admin tool (Wave 33)
- Notification when assigned as Phase Lead (Wave 30)
- Cross-phase prerequisite chain editor UI
- Mobile-friendly phase-lock UX polish (Wave 32)

## Ground Rules

TypeScript only; no `.js`/`.jsx`; no barrel files; `@/` → `src/`, `@test/` → `Testing/test-utils`; **no raw date math** — Task 1's date-engine carve-out uses existing helpers; no direct `supabase.from()` in components; Tailwind utilities only (no arbitrary values, no pure black — slate-900/zinc-900); brand button uses `bg-brand-600 hover:bg-brand-700`; optimistic mutations must force-refetch in `onError`; max subtask depth = 1; template vs instance: checkpoint kind is instance-only (templates have no project_kind); frontend/Deno date helpers stay in lock-step (`isCheckpointProject` mirrored byte-equivalent — keep updates synchronized); **zero new npm dependencies** (recharts already bundled); atomic revertable commits; build + lint + tests clean before every push; DB migrations are additive-only.
