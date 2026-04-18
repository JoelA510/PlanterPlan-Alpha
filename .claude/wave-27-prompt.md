## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 26 shipped to `main`:
- threaded `task_comments` table + RLS + realtime publication add
- `entities.TaskComment` namespace in `planterClient` + soft-delete contract
- `<TaskComments />` mounted in `TaskDetailsView` (compose, list with depth-1 UI nesting, edit/delete own)
- `useTaskCommentsRealtime` invalidating the cache on remote writes

Spec is at **1.11.0**. §3.3 Collaboration Suite is `[/]` (in progress) with the `[x] Threaded comments (Wave 26)` sub-bullet flipped. Wave 27 closes the remaining two thirds: an **activity log / audit trail** and **realtime presence**. After this wave, §3.3 Collaboration Suite flips fully `[x]`.

**Gate baseline going into Wave 27:** confirm the current `main` baseline before starting. Run `npm run lint`, `npm run build`, `npx vitest run` — record the file/test count from Wave 26's verification gate as the starting baseline. Note specifically the comment-related tests added in Wave 26 (the activity-log work in Task 1 below extends those test fixtures).

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-27-activity-log`
- Task 2 → `claude/wave-27-presence`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 27 scope

Two tasks. Activity log is the heavier of the two (DB triggers + UI route + RLS); presence is purely a React Query + Supabase Realtime presence channel layer with no DB schema. Together they close §3.3 Collaboration Suite.

---

### Task 1 — Activity log / audit trail

**Commit:** `feat(wave-27): activity_log table + write triggers + activity tab UI`

Capture every meaningful state change on `tasks`, `project_members`, and `task_comments` into a single append-only audit table; surface the project-scoped feed inside a new "Activity" tab on the project detail page.

1. **Migration** (`docs/db/migrations/2026_XX_XX_activity_log.sql`, NEW)
   - `CREATE TABLE public.activity_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, entity_type text NOT NULL CHECK (entity_type IN ('task', 'comment', 'member', 'project')), entity_id uuid NOT NULL, action text NOT NULL CHECK (action IN ('created','updated','deleted','status_changed','member_added','member_removed','member_role_changed','comment_posted','comment_edited','comment_deleted')), payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())`.
   - `CREATE INDEX idx_activity_log_project_id ON public.activity_log (project_id, created_at DESC)`.
   - `CREATE INDEX idx_activity_log_entity ON public.activity_log (entity_type, entity_id, created_at DESC)`.
   - **Append-only invariant:** RLS denies UPDATE/DELETE except for `is_admin(auth.uid())`. SELECT is `is_active_member(project_id, auth.uid()) OR is_admin(auth.uid())`. INSERT happens via SECURITY DEFINER functions only — direct INSERTs from anon/auth roles are denied.
   - **Trigger functions** (all SECURITY DEFINER, `SET search_path TO ''`):
     - `public.log_task_change()` — `AFTER INSERT OR UPDATE OR DELETE ON public.tasks FOR EACH ROW`. Branches on TG_OP. INSERT → `('task','created', { title, parent_task_id, status })`. UPDATE → diffs `OLD.status` vs `NEW.status` and emits `status_changed` with `{ from, to }` when they differ; otherwise emits `updated` with the changed-keys list (not the full row — keep payloads small). DELETE → `('task','deleted', { title })`. `actor_id := auth.uid()` (NULL inside server-side cron / nightly-sync).
     - `public.log_comment_change()` — `AFTER INSERT OR UPDATE OR DELETE ON public.task_comments FOR EACH ROW`. INSERT → `('comment','comment_posted', { task_id, body_preview: substring(body, 1, 140) })`. UPDATE → if `OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL` emit `comment_deleted`; else if `OLD.body IS DISTINCT FROM NEW.body` emit `comment_edited`. Hard DELETE → `comment_deleted`.
     - `public.log_member_change()` — `AFTER INSERT OR UPDATE OR DELETE ON public.project_members FOR EACH ROW`. INSERT → `member_added` with `{ user_id, role }`. UPDATE → if `OLD.role <> NEW.role` emit `member_role_changed` with `{ user_id, from, to }`. DELETE → `member_removed`.
   - All three trigger functions resolve `project_id` correctly for the entity:
     - `tasks` → `COALESCE(NEW.root_id, OLD.root_id, NEW.id, OLD.id)` (root rows are their own project).
     - `task_comments` → `NEW.root_id` / `OLD.root_id`.
     - `project_members` → `NEW.project_id` / `OLD.project_id`.
   - Bind triggers: `trg_log_task_change`, `trg_log_comment_change`, `trg_log_member_change`. All AFTER triggers so they run on the post-write state.
   - Mirror everything into `docs/db/schema.sql`.

2. **planterClient method** (`src/shared/api/planterClient.ts`)
   - New `entities.ActivityLog` namespace:
     - `listByProject(projectId: string, opts?: { limit?: number; before?: string; entityTypes?: string[] }): Promise<ActivityLogRow[]>` — joins author email/avatar via `actor:users(id, email, user_metadata)`. Default `limit = 50`, `entityTypes` defaults to all four types.
     - `listByEntity(entityType: string, entityId: string, opts?: { limit?: number }): Promise<ActivityLogRow[]>` — for the per-task activity rail in step 5.

3. **Domain types** (`src/shared/db/app.types.ts`)
   - `export type ActivityLogRow = Database['public']['Tables']['activity_log']['Row'];`
   - `ActivityLogWithActor = ActivityLogRow & { actor: { id: string; email: string; user_metadata?: UserMetadata } | null }`.
   - Hand-add the `activity_log` block to `database.types.ts` per the established pattern.

4. **Hook** (`src/features/projects/hooks/useProjectActivity.ts`, NEW)
   - `useProjectActivity(projectId: string | null, opts?: { limit?: number; entityTypes?: string[] })` returning `useQuery({ queryKey: ['activityLog', projectId, opts], enabled: !!projectId })`.
   - `useTaskActivity(taskId: string | null, opts?: { limit?: number })` returning `useQuery({ queryKey: ['activityLog', 'task', taskId], enabled: !!taskId })`.

5. **UI — project-level Activity tab** (`src/features/projects/components/ProjectActivityTab.tsx`, NEW + integration into `pages/Project.tsx` or `src/features/projects/components/ProjectTabs.tsx`)
   - New tab "Activity" alongside the existing project tabs. Renders the chronological event feed grouped by day (today, yesterday, dates beyond — use `formatDisplayDate` from `date-engine`).
   - Each row: actor avatar/initials + verb sentence + entity link (when applicable, links to `/project/:id` task with the panel open). Filter chips at the top: `All | Tasks | Comments | Members`. Filter is client-side filtering of the already-fetched list, not a refetch.
   - Empty state: "No activity yet — create a task or invite a teammate to get started."
   - Pagination: "Load older" button at the bottom that bumps `limit` by 50 (or refetches with `before = last.created_at`). Don't auto-load on scroll for now.

6. **UI — per-task activity rail** (`src/features/tasks/components/TaskDetailsView.tsx`)
   - Below the existing Comments section, add a small collapsed `<details>` titled "Activity" (default closed) that, when opened, fetches `useTaskActivity(task.id, { limit: 20 })` and renders the same row component as the project Activity tab. Keeps the per-task surface lightweight; the heavy lift is the project-level tab.

7. **Architecture doc** (`docs/architecture/dashboard-analytics.md`)
   - New `## Activity Log (Wave 27)` section. Document: append-only contract, the four `entity_type` values, the action vocabulary, payload-shape conventions (preview-only — never store full task body), and the consumer pattern (one project-level tab + one per-task collapsed rail).

8. **Tests**
   - `Testing/unit/shared/api/planterClient.activityLog.test.ts` (NEW) — query shapes, default limits, entity filters, the `before` cursor.
   - `Testing/unit/features/projects/hooks/useProjectActivity.test.tsx` (NEW) — pagination behavior; query-key invalidation when filters change.
   - `Testing/unit/features/projects/components/ProjectActivityTab.test.tsx` (NEW) — empty state, filter-chip behavior, day-grouping, "Load older" button.
   - Manual `psql` smoke at `docs/db/tests/activity_log_triggers.sql` — exercises each of the nine action types via `INSERT/UPDATE/DELETE` on the source tables and asserts the corresponding `activity_log` row materializes.

**DB migration?** Yes — additive (one table + two indexes + three trigger functions + three triggers + RLS).

**Out of scope:** undo / "revert this change" affordance (the log is read-only this wave); rich diff rendering for `task` UPDATE payloads (we only show changed-keys and status from→to — full diff UI is a Wave 33 admin-tool extension); cross-project activity for admins (deferred — admin would need a different RLS path; Wave 33 picks this up).

---

### Task 2 — Realtime presence cursors

**Commit:** `feat(wave-27): realtime presence + cursors on the project task list`

Use Supabase Realtime presence to show who is currently viewing a project, and a soft-cursor indicator on the task list so concurrent editors can see each other's focus. Pure frontend wiring on top of the existing realtime infrastructure — **no schema change**.

1. **Presence hook** (`src/features/projects/hooks/useProjectPresence.ts`, NEW)
   - `useProjectPresence(projectId: string | null)` — opens a Supabase realtime presence channel keyed `presence:project:<projectId>`.
   - On mount, `track({ user_id, email, name, joinedAt: Date.now() })` — sourced from `AuthContext`. Note the `joinedAt` lets the UI sort presence by oldest-first (the project owner who's been there since the meeting started, etc.).
   - Subscribes to `presence` events `sync | join | leave`. Maintains an internal `Map<userId, PresenceState>` via `useState` and returns `{ presentUsers: PresenceState[], myPresenceKey: string | null }`.
   - Cleanup on unmount: `untrack()` then `removeChannel()`.

2. **Active-user chip rail** (`src/features/projects/components/PresenceBar.tsx`, NEW + integration into `pages/Project.tsx` or `ProjectHeader.tsx`)
   - Renders 1–N circular avatar chips at the top right of the project header (overlap the existing project title bar's right edge). Each chip is the user's initials with a subtle border ring; tooltip shows full email + "viewing for X minutes".
   - Cap at 5 visible chips with a `+N` overflow chip; clicking the overflow opens a Shadcn `Popover` listing the rest.
   - Hide self by default (don't show your own chip in your own UI). Toggle in `Settings` to "Show me in presence" (defaults to `true` for the next user-facing wave; for Wave 27 the toggle is hardcoded `true` and **sending** presence cannot be disabled — receiving is opt-out only via a future Settings flag, deferred).

3. **Task focus broadcast** (`src/features/tasks/hooks/useTaskFocusBroadcast.ts`, NEW)
   - Lighter-weight broadcast on the same presence channel: when the user opens a task detail panel, `channel.track({ ...currentPresence, focusedTaskId: task.id })`. When the panel closes, `track({ ...currentPresence, focusedTaskId: null })`.
   - Debounce focus changes at 250ms so rapid open-close-open during navigation doesn't spam the channel.

4. **Per-row focus indicator** (`src/features/tasks/components/TaskList.tsx` or `TaskItem.tsx`)
   - When another user's `focusedTaskId === thisRow.task.id`, render a small avatar chip at the row's right edge (`absolute right-2 top-1/2`). Tooltip: "@email is viewing this task." Cap at 3 chips per row with an overflow.
   - This is the only Wave 27 hook into `TaskList` — the row's main render path stays unchanged.

5. **Disabled in non-collab routes:** `/dashboard`, `/reports`, `/tasks` (My Tasks view) do not need presence — only `/project/:id` does. Mount `useProjectPresence` exclusively from `pages/Project.tsx`.

6. **Architecture doc** (`docs/architecture/dashboard-analytics.md` or new `docs/architecture/realtime.md` — author's call; default to extending `dashboard-analytics.md` to keep doc count flat)
   - Document the channel naming (`presence:project:<id>`), the `PresenceState` shape, the sender/receiver split, and the row-focus debouncing rule.

7. **Tests**
   - `Testing/unit/features/projects/hooks/useProjectPresence.test.tsx` (NEW) — mock the Supabase channel; assert `track`/`untrack` are called on mount/unmount; assert the `presence sync` event populates `presentUsers` correctly; assert duplicate user_ids are de-duped (if a user opens two tabs, the one with the earlier `joinedAt` wins).
   - `Testing/unit/features/projects/components/PresenceBar.test.tsx` (NEW) — chip overflow at >5; self-hide; tooltip content.
   - `Testing/unit/features/tasks/hooks/useTaskFocusBroadcast.test.ts` (NEW) — debounce behavior; track payload shape; cleanup on unmount.

**DB migration?** No — pure frontend over the existing realtime infrastructure.

**Out of scope:** mouse cursor pointers (deferred — not worth the bandwidth for a project tool); typing indicators in the comment composer (defer to Wave 30 alongside the notification infrastructure if it makes sense there); persisting "last seen" timestamps to the DB.

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — flip §3.3 Collaboration Suite from `[/]` to `[x]` and append `[x] Activity log (Wave 27)` and `[x] Realtime presence (Wave 27)` sub-bullets. Bump version to **1.12.0** (the §3.3 surface is fully shipped). Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — add two golden-path bullets: "Activity Log (Wave 27)" pointing to `entities.ActivityLog` + `useProjectActivity` + the project tab + per-task rail; "Realtime Presence (Wave 27)" pointing to `useProjectPresence` + `PresenceBar` + the row-focus chip path.
3. **`docs/architecture/dashboard-analytics.md`** — Task 1's `## Activity Log (Wave 27)` section is in. Task 2's presence section is in (or moved to `docs/architecture/realtime.md` if the doc tree reorg felt right at the time).
4. **`docs/architecture/auth-rbac.md`** — one-line note under Resolved or Business Rules: "Activity log SELECT inherits project membership; INSERT is SECURITY DEFINER trigger only; UPDATE/DELETE denied except for admin." Mirrors the comments doc-cross-reference precedent set in Wave 26.
5. **`docs/dev-notes.md`** — no new entries expected. Confirm currency.
6. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 27 (Activity Log + Presence)`, update `last_completed`, `spec_version`, add `wave_27_highlights:` block.
7. **`CLAUDE.md`** — add `activity_log` to the Tables list with the append-only invariant noted; mention that comments + activity log + presence together comprise the §3.3 Collaboration Suite.

Land docs as a single `docs(wave-27): documentation currency sweep` commit (or per-task split, operator's call).

## Wave Review (mandatory — before commit + push to main)

1. **Trigger correctness** — for each of the three log triggers, manually run the smoke script and confirm the row materializes with the expected `entity_type`, `action`, and `payload` shape. Pay special attention to the `task_comments` UPDATE trigger's branch (soft-delete vs. body-edit).
2. **RLS denial paths** — try inserting into `activity_log` directly as `auth` role (should fail). Try updating an existing row (should fail). Try selecting from a project you're not a member of (should return 0 rows).
3. **Presence cleanup** — open `/project/:id` in two tabs as the same user → confirm the de-dupe rule keeps a single chip. Close one tab → presence should drop to "single tab". Close the other → presence should clear. Hard-refresh shouldn't leave a zombie entry (Supabase realtime auto-expires after ~30s but verify in Studio).
4. **Channel-count audit** — open the network panel during a task-detail open/close cycle. The presence channel should be **one** per project; `useTaskFocusBroadcast` should not be opening a separate channel.
5. **No FSD drift** — `useProjectPresence` lives in `features/projects/hooks/` (not `shared/`); `useTaskFocusBroadcast` lives in `features/tasks/hooks/`. Any helper that crosses domains either lives in `shared/` (if pure) or is duplicated (if domain-specific).
6. **Type drift** — `database.types.ts` was hand-edited again; revert any accidental regenerate.
7. **Test coverage** — new hooks/components have matching tests. The `psql` smoke for the activity log triggers is documented in the PR description.
8. **Lint + build + tests** — green.

## Commit & Push to Main (mandatory — gates Wave 28)

After both Tasks 1 and 2 PRs merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. The history should show: 2 task commits + 1 docs sweep commit on top of Wave 26's commits.
3. Push to `origin/main`. Wait for any CI to pass.
4. **Do not start Wave 28** until `main` is green and the Documentation Currency Pass is fully merged.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline 7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # baseline + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- **Task 1:** create a task → check the Activity tab → row appears with action `created`. Toggle a task to `completed` → see `status_changed` row. Post a comment → see `comment_posted`. Invite a member → see `member_added`. Filter by `Members` → see only member rows. Filter by `Comments` → see only comment rows. "Load older" appends rather than replaces.
- **Task 2:** open `/project/:id` in two browsers (different accounts on the same project). Each sees the other's chip in the header presence bar. Open a task detail in window A → window B's `TaskList` shows a chip on that row. Close the panel in window A → chip disappears within 500ms.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT (read before touching business logic)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `docs/db/schema.sql` — SSoT for DB objects; mirror every migration here
- `docs/db/migrations/2026_XX_XX_task_comments.sql` — Wave 26 RLS-additive precedent for SELECT-by-membership
- `pages/Project.tsx` — Wave 27's primary integration host (presence channel + presence bar + activity tab)
- `src/features/tasks/components/TaskList.tsx` — Task 2 row-focus integration host
- Supabase Realtime presence docs — read before implementing Task 2

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror Task 1 migration)
- `docs/architecture/dashboard-analytics.md` (Activity Log + Presence sections)
- `docs/architecture/auth-rbac.md` (one-line activity log RLS note)
- `docs/AGENT_CONTEXT.md` (Wave 27 golden-path additions)
- `docs/dev-notes.md` (currency check)
- `src/shared/db/database.types.ts` (hand-add `activity_log` block)
- `src/shared/db/app.types.ts` (`ActivityLogRow/Insert/Update`, `ActivityLogWithActor`)
- `src/shared/api/planterClient.ts` (`entities.ActivityLog`)
- `src/features/tasks/components/TaskDetailsView.tsx` (per-task activity rail)
- `src/features/tasks/components/TaskList.tsx` (row-focus chip)
- `pages/Project.tsx` (mount presence + activity tab)
- `src/features/projects/components/ProjectTabs.tsx` (or wherever the tab list lives) — add Activity tab
- `spec.md` (flip §3.3 Collaboration Suite to `[x]` + sub-bullets, bump to 1.12.0)
- `repo-context.yaml` (Wave 27 highlights block)
- `CLAUDE.md` (`activity_log` table summary)

**Will create:**
- `docs/db/migrations/2026_XX_XX_activity_log.sql`
- `docs/db/tests/activity_log_triggers.sql`
- `src/features/projects/components/ProjectActivityTab.tsx`
- `src/features/projects/components/PresenceBar.tsx`
- `src/features/projects/hooks/useProjectActivity.ts`
- `src/features/projects/hooks/useProjectPresence.ts`
- `src/features/tasks/hooks/useTaskFocusBroadcast.ts`
- `Testing/unit/shared/api/planterClient.activityLog.test.ts`
- `Testing/unit/features/projects/hooks/useProjectActivity.test.tsx`
- `Testing/unit/features/projects/components/ProjectActivityTab.test.tsx`
- `Testing/unit/features/projects/hooks/useProjectPresence.test.tsx`
- `Testing/unit/features/projects/components/PresenceBar.test.tsx`
- `Testing/unit/features/tasks/hooks/useTaskFocusBroadcast.test.ts`

**Explicitly out of scope this wave:**
- Undo / revert from the activity log
- Mouse-cursor presence
- Typing indicators in the comment composer
- Cross-project activity feed for admins (Wave 33)
- Push notifications driven by activity log events (Wave 30)
- Activity log retention / archival policy (deferred — log grows; revisit at first user-reported perf issue)
- Server-side aggregation / "X tasks updated by Y this week" rollups (deferred — could be a Wave 33 admin nice-to-have)

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (use `date-engine` — group activity by day via `formatDisplayDate`); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error (presence is read-only — N/A here); max subtask depth = 1; template vs instance clarified on any cross-cutting work; only add dependencies if truly necessary (Wave 27 should add **zero** new npm deps — Supabase Realtime is already in the bundle); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only unless the user explicitly approves a breaking change in-session.
