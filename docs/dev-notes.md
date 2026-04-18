# Dev Notes

Technical debt and architectural notes for the team.

## Database

### No type discriminator on `tasks`

**Resolved (Wave 25).** `public.tasks` now carries a `task_type text` column with a CHECK constraint (`'project' | 'phase' | 'milestone' | 'task' | 'subtask'`) and a supporting btree index. `public.derive_task_type(parent_task_id uuid)` returns the correct value by walking up to three levels of the parent chain. The `trg_set_task_type` BEFORE INSERT OR UPDATE OF `parent_task_id` trigger keeps `NEW.task_type` in lockstep so writers never have to set the column manually. Existing rows were backfilled by the migration. `'subtask'` stays reserved in the CHECK constraint for future use but isn't emitted today (the max-depth-1 subtask invariant lives in app code). Migration: `docs/db/migrations/2026_04_18_task_type_discriminator.sql`.

No existing query has been rewritten to consume `task_type` yet — this wave is additive only. Future perf passes can drop recursive tree walks in favour of `WHERE task_type = ...` as needed.

_Historical:_ the `tasks` table stored Projects, Phases, Milestones, and Tasks in a single table with no discriminator column. Queries like "all phases" or "all leaf tasks" required recursive `parent_task_id` walks.

```
Project  → parent_task_id = null, root_id = id
  Phase  → parent_task_id = project_id
    Milestone → parent_task_id = phase_id
      Task    → parent_task_id = milestone_id
```

### Dual completion signals

**Resolved (Wave 23).** `sync_task_completion_flags` BEFORE INSERT/UPDATE trigger on `public.tasks` now guarantees `is_complete === (status === 'completed')` at the DB layer. `check_phase_unlock()` (reads `is_complete`) and `handle_phase_completion()` (reads `status`) both see the synced row since the BEFORE trigger fires first. The app-layer mirror in `planterClient.updateStatus` is simplified: only `status` is sent on every server payload; the trigger derives `is_complete`. Migration: `docs/db/migrations/2026_04_17_sync_task_completion.sql`. Architecture note: `docs/architecture/tasks-subtasks.md` — Auto-Completion Automation.

_Historical:_ `is_complete` (boolean) and `status = 'completed'` (text) represented the same concept but were consumed by different triggers. If they drifted — e.g., raw SQL updated only one side — only one trigger fired and phase unlocking silently broke. The fix is belt-and-suspenders: the app layer no longer deliberately writes both; the DB trigger enforces the invariant regardless.

### `check_project_ownership` is a latent auth bug

**Resolved (Wave 24).** The leak is closed. Each of the four RLS policies on `public.project_members` has been rewritten per the Wave 23 audit:
* `members_insert_policy` → uses `check_project_creatorship` directly (bootstrap only).
* `members_select_policy` → creatorship branch dropped (redundant + was the actual leak).
* `members_delete_policy` / `members_update_policy` → use a new `check_project_ownership_by_role(pid, uid)` helper that queries `project_members.role = 'owner'`. A former creator who has been removed from `project_members` no longer passes.

The `check_project_ownership` shim has been dropped. Migration: `docs/db/migrations/2026_04_18_rewrite_project_members_policies.sql`. Audit table and final policy states: `docs/architecture/auth-rbac.md`.

_Historical (Wave 23 audit):_ `public.check_project_creatorship(pid, uid)` was introduced carrying the original body; `public.check_project_ownership` became a thin SQL shim delegating to it so the four policies could be rewritten in Wave 24 without a byte-for-byte semantic change window.
