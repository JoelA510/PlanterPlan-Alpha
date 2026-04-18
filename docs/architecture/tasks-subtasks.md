# docs/architecture/tasks-subtasks.md

## Domain Overview
This domain governs the atomic execution units within a Project. It provides the interface for task CRUD, status management, dependency mapping, and hierarchical re-organization via drag-and-drop.

## Core Entities & Data Models
* **Task:** The foundational work unit.
  * **Fields:** `Title`, `Description`, `Purpose`, `Actions`, `Additional Resources`, `Start Date`, `End Date`, `Notes`, `Assignee`, `Status`.
* **Subtask:** A child node of a Task.
* **Dependency:** A horizontal link between tasks dictating order of execution.
* **`task_type` discriminator (Wave 25):** a `text` column on `public.tasks` kept in lockstep with the row's depth in the `parent_task_id` tree. Possible values: `'project' | 'phase' | 'milestone' | 'task' | 'subtask'` (the last is reserved; `derive_task_type` returns `'task'` for depth ≥ 3 today, matching the app-level max-subtask-depth-1 invariant). Writers do not set the column manually — the `trg_set_task_type` BEFORE INSERT OR UPDATE OF `parent_task_id` trigger calls `public.derive_task_type(parent_task_id)` and assigns the result. Consumers can use the column to skip recursive tree walks ("all phases", "all milestones", "all leaves"). Migration: `docs/db/migrations/2026_04_18_task_type_discriminator.sql`.

## State Machines / Lifecycles
### Task Completion Lifecycle
Transitions strictly through: `To Do` -> `In Progress` -> `Complete` -> `Blocked` -> `N/A`.

### Auto-Completion Automation
* Toggling a parent to `Complete` forces a confirmation prompt if dependent sub-items exist. Confirmation cascades `Complete` status to all children.
* Any status toggle instantly recalculates parent Milestone/Project completion percentages.
* **Completion-flag invariant (Wave 23):** `is_complete === (status === 'completed')` is enforced *unconditionally* at the DB layer by the `sync_task_completion_flags` BEFORE INSERT/UPDATE trigger on `public.tasks` (migration: `docs/db/migrations/2026_04_17_sync_task_completion.sql`). The app-layer cascade/bubble-up logic in `planterClient.updateStatus` still owns multi-row orchestration — it now writes **only** `status` on every server payload and relies on the trigger to derive `is_complete`. Single-field raw SQL writes are reconciled (`UPDATE tasks SET status = 'completed'` flips `is_complete` to `true`, and vice versa). Dual-field writes are *also* reconciled — **`status` is the source of truth**, so `UPDATE tasks SET status = 'completed', is_complete = false` lands as `(status='completed', is_complete=true)`. There is no "both sides trusted" escape hatch; the invariant is the contract. Cross-ref: `docs/dev-notes.md` "Dual completion signals" (resolved Wave 23).

## Business Rules & Constraints
* **Max Subtask Depth:** Subtasks *cannot* have child tasks (Maximum depth = 1).
  * *Constraint:* If Task A has Subtask X, Task A cannot be dropped into Task B to become a subtask, preventing depth violations.
* **Drag-and-Drop Constraints (`dragDropUtils.ts`):**
  * Items dropped adjacent to peers reorder the list index.
  * A childless Task dropped inside another Task becomes a Subtask.
  * Dragging a Task moves all of its nested Subtasks concurrently.
* **Kanban Board V2 (Wave 20):** Native column-to-column drag-and-drop is implemented in `src/features/tasks/components/board/` (`ProjectBoardView.tsx`, `BoardColumn.tsx`, `BoardTaskCard.tsx`). Drops between columns change task `status`; depth constraints and cycle detection still apply.
* **Dependencies:** Tasks mapped as dependencies cannot be closed out of sequence without throwing a warning.
* **Deletion Invariants:** Deleting an item triggers a warning and cascades a hard delete to all descendants.

## Recurrence (Wave 21)
A **template task** (`origin = 'template'`) may carry a recurrence rule under
`settings.recurrence`. When the rule fires, `supabase/functions/nightly-sync/`
deep-clones the template into the configured target project as an instance.

**Rule shape** (`src/shared/db/app.types.ts` → `RecurrenceRule`):
* `{ kind: 'weekly',  weekday: 0..6, targetProjectId }` — matches UTC weekday (0 = Sunday).
* `{ kind: 'monthly', dayOfMonth: 1..28, targetProjectId }` — capped at 28 to avoid Feb/leap edges.

**Evaluator:** `src/shared/lib/recurrence.ts` (frontend) and a byte-equivalent
mirror at `supabase/functions/_shared/recurrence.ts` (Deno). Keep the two
files in lock-step.

**Idempotency:** the spawned instance carries `settings.spawnedFromTemplate`
(template id) and `settings.spawnedOn` (UTC `YYYY-MM-DD`). The nightly-sync
recurrence pass short-circuits when a matching row already exists, so same-day
re-invocations are safe. **Note (Wave 22):** `Task.clone` in
`src/shared/api/planterClient.ts` now also stamps
`settings.spawnedFromTemplate` on every interactive clone, so the same key
powers both the recurrence idempotency check and the Master Library
de-duplication described in `library-templates.md`.

**UI:** `src/features/tasks/components/RecurrencePicker.tsx` renders inside
`TaskForm` only when `origin === 'template'`. The form emits flat
`recurrence_*` fields which `src/features/tasks/lib/recurrence-form.ts`
normalises into the nested JSONB shape before persisting.

## Coaching Tasks (Wave 22)

Any **instance task** (`origin = 'instance'`) may be tagged as a *coaching
task* via `settings.is_coaching_task: true`. The flag widens edit access
to users with the project `coach` role via an additive RLS UPDATE policy
(see `auth-rbac.md`).

**Flag shape** (`src/shared/db/app.types.ts` → `TaskSettings`):
* `is_coaching_task?: boolean` — absence / `false` both mean "not a coaching
  task"; only `=== true` activates the coach UPDATE policy.

**Authoring:** the "Coaching task" checkbox in
`src/features/tasks/components/TaskFormFields.tsx` is gated to
`membershipRole ∈ {owner, editor}` and shown only for instance origin. The
prop flows `pages/Project.tsx` → `TaskDetailsPanel` → `TaskForm` →
`TaskFormFields`. Coaches/viewers cannot toggle the flag.

**Normalisation:** submit emits a flat `is_coaching_task` field. The helper
pair in `src/features/tasks/lib/coaching-form.ts` handles the merge into
`settings`:
* `formDataToCoachingFlag(data)` → `true | false | null` (null = leave
  settings untouched — the UI gate hid the checkbox).
* `applyCoachingFlag(currentSettings, flag)` — preserves every other key,
  sets or deletes `is_coaching_task` per the flag.
* `extractCoachingFlag(task)` — canonical reader used by both `TaskForm`
  (seed `defaultValues`) and `TaskDetailsView` (badge).

**Surface:** `TaskDetailsView.tsx` renders a "Coaching" badge in the status
row when `extractCoachingFlag(task)` returns `true`.

**RLS:** `docs/db/migrations/2026_04_17_coaching_task_rls.sql` adds the
`"Enable update for coaches on coaching tasks"` policy. It's purely
additive — the owner/editor/admin UPDATE policy is unchanged, so coaches
retain zero access to non-coaching rows and to templates. Policy text is
mirrored into `docs/db/schema.sql` as the SSoT.

**Auto-assignment (Wave 23):**
`docs/db/migrations/2026_04_17_coaching_auto_assign.sql` adds a
`BEFORE INSERT OR UPDATE ON public.tasks` trigger (`trg_set_coaching_assignee`
→ `set_coaching_assignee()`). When a row carries
`settings.is_coaching_task = true` AND `assignee_id` is null, the trigger
looks up `project_members WHERE project_id = COALESCE(NEW.root_id, NEW.id)
AND role = 'coach'`. If *exactly one* coach is found, `NEW.assignee_id` is
set to that user. **Zero or multiple coaches → no-op**, leaving the field
null so a human can pick. **User intent wins:** the trigger never
overwrites a non-null `assignee_id` the caller supplied. The UI picks up
the server-assigned coach via the standard `useUpdateTask` / `useCreateTask`
`onSettled` invalidation of `['projectHierarchy', rootId]`.

**Backfill on membership change (Wave 24):**
`docs/db/migrations/2026_04_18_coaching_backfill_on_membership.sql` adds
a symmetric `AFTER INSERT OR UPDATE OR DELETE ON public.project_members`
trigger (`trg_backfill_coaching_assignees` → `backfill_coaching_assignees()`).
Wave 23's trigger fires only on task writes, so coaching tasks that were
created while the project had zero or multiple coaches retained
`assignee_id = NULL` forever. This wave closes that gap: when a
membership change causes the project to have **exactly one** coach, the
trigger runs `UPDATE public.tasks SET assignee_id = <sole coach>` over
every instance task on that project where `settings.is_coaching_task = true`
AND `assignee_id IS NULL`. **Never un-assigns:** transitioning from
1 → 0 coaches leaves existing assignments intact. **User intent still
wins:** the `assignee_id IS NULL` filter skips any task that already has
a caller-supplied assignee. Scoped via `root_id = <project_id>` so
unrelated projects are never touched.

## Strategy Templates (Wave 24)

Any **instance task** (`origin = 'instance'`) may be tagged as a *strategy
template* via `settings.is_strategy_template: true`. The flag is purely a
UX convention — no RLS carve-out, no additional DB triggers. It tells the
UI to surface Master Library follow-ups when the task is marked
`completed`, so planters can pull in a curated set of next-step tasks
right at the moment of completion.

**Flag shape** (`src/shared/db/app.types.ts` → `TaskSettings`):
* `is_strategy_template?: boolean` — absence / `false` both mean "not a
  strategy template"; only `=== true` activates the follow-up dialog.

**Authoring:** the "Strategy template" checkbox in
`src/features/tasks/components/TaskFormFields.tsx` sits next to the
"Coaching task" checkbox and shares the same permission gate
(`membershipRole ∈ {owner, editor}`, `origin === 'instance'`). The prop
chain matches Coaching: `pages/Project.tsx` → `TaskDetailsPanel` →
`TaskForm` → `TaskFormFields`.

**Normalisation:** submit emits a flat `is_strategy_template` field. The
helper trio in `src/features/tasks/lib/strategy-form.ts` mirrors
`coaching-form.ts`:
* `formDataToStrategyTemplateFlag(data)` → `true | false | null` (null =
  leave settings untouched — the UI gate hid the checkbox).
* `applyStrategyTemplateFlag(currentSettings, flag)` — preserves every
  other settings key, sets or deletes `is_strategy_template` per the flag.
  Designed to chain after `applyCoachingFlag` in the merge sequence.
* `extractStrategyTemplateFlag(task)` — canonical reader used by both
  `TaskForm` (seed `defaultValues`) and `TaskDetailsView` (badge + dialog
  edge-trigger).

**Surface:** `TaskDetailsView` renders a "Strategy Template" emerald
badge next to the Coaching sky badge when the flag is true, and edge-
triggers `StrategyFollowUpDialog` exactly once per transition of
`status` into `'completed'` (via a `prevStatusRef` comparison in
`useEffect` so repeated re-renders with an already-completed row don't
reopen the dialog).

**Follow-up dialog**
(`src/features/tasks/components/StrategyFollowUpDialog.tsx`): wraps
`MasterLibrarySearch` in a Shadcn `Dialog`. Each pick calls
`planter.entities.Task.clone(templateId, parent_task_id, 'instance',
userId)` — the cloned task lands as a **sibling** of the completed
strategy task (same `parent_task_id`). Already-present templates are
hidden via the `excludeTemplateIds` prop (same dedupe convention as the
Wave 22 Master Library work). Dismissal is first-class; users may add
zero or many follow-ups.

**No DB migration.** The flag rides on existing `settings` JSONB; no new
RLS policy needed. Owners / editors already have UPDATE access on
instance tasks.

## Integration Points
* **Date Engine:** Dragging tasks triggers date inheritance logic (`dateInheritance.ts`) to adjust bounds automatically.
* **Dashboard:** Feeds raw status counts.
* **Nightly CRON:** Owns the recurrence-clone pass (see `supabase/functions/nightly-sync/README.md`).

## Known Gaps / Technical Debt
* None currently identified.