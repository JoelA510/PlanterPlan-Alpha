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

`is_complete` (boolean) and `status = 'completed'` (text) represent the same concept but are consumed by different triggers:

- `check_phase_unlock()` listens for `is_complete = true` — unlocks dependent phases via `prerequisite_phase_id`
- `handle_phase_completion()` listens for `status = 'completed'` — unlocks the next sibling by `position`

If these two fields get out of sync (e.g., `status` is set to `'completed'` but `is_complete` stays `false`), only one trigger fires. This should be unified — either derive one from the other via trigger, or drop `is_complete` entirely and have `check_phase_unlock` read `status` instead.

### `check_project_ownership` is a latent auth bug

The `check_project_ownership(pid, uid)` function checks `tasks.creator = uid`, **not** the `owner` role in `project_members`. This means if someone creates a project and later gets removed as a member, they still pass this check. The `project_members` RLS policies that use this function could grant access to removed users.

Fix: rewrite `check_project_ownership` to check `project_members.role = 'owner'` instead of `tasks.creator`, or rename it to `check_project_creatorship` to avoid confusion and audit all call sites.
