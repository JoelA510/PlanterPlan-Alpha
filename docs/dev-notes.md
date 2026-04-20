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

### `task_comments.author:users(...)` PostgREST join is typed-client-hostile

**Active. Target: Wave 30.** `planter.entities.TaskComment.{listByTask, create}` select `*, author:users(id, email, user_metadata)` across the `public`/`auth` schema boundary. The Supabase generated types don't model a FK from `task_comments.author_id` to `auth.users.id`, so the typed client surfaces a `SelectQueryError<"could not find the relation between task_comments and users">`. The current workaround casts through `unknown` and ships: at runtime PostgREST sometimes resolves the join, sometimes returns `author: null` (the row-level type already allows null, so the UI falls back to initials + "Unknown" via `<Avatar>`).

Problem: when the join fails silently, `TaskCommentWithAuthor.author` is `null` and the UI can't show a real name. More importantly, Wave 30's notification stack needs resolved `author_id → auth.users.email` for mention dispatch — the null-author case is a soft failure for display but a hard miss for notifications.

Fix in Wave 30 (prefer): ship a `public.list_task_comments_with_authors(p_task_id uuid)` SECURITY DEFINER RPC that JOINs `task_comments` against `auth.users` internally and returns the hydrated shape. Swap `listByTask` to `planter.rpc('list_task_comments_with_authors', { p_task_id: taskId })`. Drop the cross-schema PostgREST select. The RPC also centralises the `resolve_user_handles` path Wave 30 already plans to ship. Alternative: add a `public.comment_authors` view that mirrors the relevant `auth.users` columns with an RLS policy keyed on `is_active_member`, and switch the select to `author:comment_authors!author_id(...)` — less elegant but avoids the RPC round trip.

Until that lands, the UI degrades gracefully but any mention-based feature is blocked on a reliable author hydrate.

**Wave 30 status note:** Wave 30 Task 3 shipped `public.resolve_user_handles(text[])` (the handle-to-uuid mapping needed by `resolveMentions` in the write path), but did NOT ship the `list_task_comments_with_authors` read-path RPC suggested above. Mention dispatch works because the trigger reads `task_comments.mentions` (resolved uuids) directly; it doesn't depend on the display-side author hydrate. The PostgREST join issue remains — future work.

### Service worker JS exception (`public/sw.js`)

**Active. Target: Wave 32.** `public/sw.js` (Wave 30 Task 2 push handler) is the only non-TypeScript file in the application tree. The styleguide calls for TS-only across `src/`; the service worker carves out one documented exception because the TS → worker build path hasn't landed yet. Wave 32's PWA / workbox setup will subsume this file with a workbox-built `src/sw.ts` and delete `public/sw.js`.

Until Wave 32 ships: do not grow `sw.js`. The current handler implements `install` / `activate` / `push` / `notificationclick` and is the complete contract. Any additional SW responsibility (offline queue, asset precache) waits for the TS rewrite.

### `task_comments.author_id ON DELETE RESTRICT` blocks account deletion

**Active. Target: Wave 33 or Wave 35.** `task_comments.author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT` (Wave 26). This matches `tasks.creator` / `project_members.user_id` — the RESTRICT was chosen deliberately per the Wave 26 plan so a comment can't go authorless while the app's `TaskCommentWithAuthor.author` contract treats non-soft-deleted rows as having an author. Trade-off: deleting an `auth.users` row is blocked if they've ever posted a comment (same blocker exists on the other two FKs).

The right fix is cross-cutting, not local: when the admin / account-deletion flow ships (Wave 33 Admin Management or Wave 35 Licensing), it needs to decide how to anonymise or reassign user-owned rows across all three tables (`tasks.creator`, `project_members.user_id`, `task_comments.author_id`, plus whatever Wave 27 adds on `activity_log` / presence). Options: (a) nullable FKs with `ON DELETE SET NULL` + tombstone display everywhere, (b) a `public.deleted_users` row-retention table that every FK can reassign to during account-deletion, (c) hard-delete cascade gated by an admin-only "purge" action. (b) is cleanest for GDPR audit trails.

Flagging at the Wave 26 level so the admin-flow plan doesn't miss `task_comments` when it audits the FK surface.

### Gantt PDF export deferred

**Active. Target: Wave 33 (Admin Management).** The gantt toolbar in `src/features/gantt/components/ProjectGantt.tsx` renders a disabled "Export PDF" button with a `title="PDF export coming soon"` tooltip. Deferred because Wave 28 intentionally ships the core timeline render + drag-shift only; print/PDF export pairs better with the Wave 33 admin reporting surface (same user flow as report scheduling). No technical blocker — wire to `window.print()` with a gantt-only print stylesheet when Wave 33 lands, or use a headless-browser export from a Deno edge function if output fidelity matters.
