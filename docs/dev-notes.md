# Dev Notes

Technical debt and architectural notes for the team.

## Database

### No type discriminator on `tasks`

The `tasks` table stores Projects, Phases, Milestones, and Tasks in a single table. There's no column to distinguish between them — the only way to know what "level" a row is at is to walk the tree via `parent_task_id`.

This means queries like "give me all phases" or "give me all leaf tasks" require recursive lookups. A `depth` or `task_type` column would make these queries trivial and improve performance.

Current hierarchy (determined only by tree depth):
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

The `check_project_ownership(pid, uid)` function checks `tasks.creator = uid`, **not** the `owner` role in `project_members`. This means if someone creates a project and later gets removed as a member, they still pass this check. The `project_members` RLS policies that use this function could grant access to removed users.

Fix: rewrite `check_project_ownership` to check `project_members.role = 'owner'` instead of `tasks.creator`, or rename it to `check_project_creatorship` to avoid confusion and audit all call sites.
