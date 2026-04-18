## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 26 shipped to `main`:
- `task_comments` table + RLS + realtime publication add (`docs/db/migrations/2026_04_18_task_comments.sql`)
- `entities.TaskComment` namespace in `planterClient` + soft-delete contract
- `<TaskComments>` mounted in `TaskDetailsView` (compose, list with depth-1 UI nesting, edit/delete own)
- `useTaskCommentsRealtime` invalidating the cache on remote writes

Spec is at **1.11.0**. §3.3 Collaboration Suite is `[/]` with `[x] Threaded comments (Wave 26)` flipped. Wave 27 closes the remaining two thirds: an **activity log / audit trail** and **realtime presence**. After this wave, §3.3 Collaboration Suite flips fully `[x]`.

**Test baseline going into Wave 27:** Wave 26 shipped at ≥567 tests (≥547 prior + ≥20 new). Run `npm test` at the start of this wave and record the actual count. Lint baseline: 0 errors, 7 warnings — do not regress.

## Pre-flight verification (run before any task)

1. `git log --oneline -5` includes the 4 Wave 26 commits (3 task + 1 docs).
2. `\d public.task_comments` in `psql` shows the table with the 4 RLS policies from Wave 26.
3. These files exist:
   - `src/features/tasks/components/TaskComments/TaskComments.tsx`
   - `src/features/tasks/hooks/useTaskComments.ts`
   - `src/features/tasks/hooks/useTaskCommentsRealtime.ts`
   - `docs/db/migrations/2026_04_18_task_comments.sql`
4. `docs/db/schema.sql` contains `is_active_member`, `is_admin`, `check_project_ownership_by_role`, `handle_updated_at`, `set_root_id_from_parent`.
5. `src/pages/Project.tsx` already opens a project-scoped task realtime channel — `grep -n 'supabase.channel' src/pages/Project.tsx` returns ≥1 line. Wave 27 adds a presence channel; do not collide naming.
6. `src/features/projects/components/ProjectTabs.tsx` exists (Wave 27 Task 1 adds an "Activity" tab here).
7. `src/layouts/DashboardLayout.tsx` exists (presence bar mounts inside this for project routes only).
8. `recharts` is already a project dependency (Wave 19 + Wave 20 used it). `grep recharts package.json` → ≥1 hit.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-27-activity-log`
- Task 2 → `claude/wave-27-presence`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 27 scope

Two tasks. Activity log is the heavier (DB triggers + UI route + RLS); presence is pure frontend on the existing realtime infra. Together they close §3.3 Collaboration Suite.

---

### Task 1 — Activity log / audit trail

**Commit:** `feat(wave-27): activity_log table + write triggers + activity tab UI`

Capture every meaningful state change on `tasks`, `project_members`, and `task_comments` into a single append-only audit table; surface the project-scoped feed inside a new "Activity" tab on the project detail page.

**Migration**: `docs/db/migrations/2026_04_18_activity_log.sql` (NEW). Use this exact DDL:

```sql
-- Migration: Wave 27 — activity_log + write triggers
-- Date: 2026-04-18
-- Description:
--   Append-only audit trail for project-scoped writes. Three trigger functions
--   (one each for tasks, task_comments, project_members) AFTER-fire on every
--   write and INSERT a row keyed to the affected project_id. RLS grants SELECT
--   to project members + admin; INSERT/UPDATE/DELETE are denied — only the
--   trigger functions (SECURITY DEFINER) write rows.
--
--   Payload sizes are kept small: a comment's body_preview is `substring(body, 1, 140)`
--   not the full body. Task UPDATE payloads list changed-keys only, not the full row.
--
--   The comment-change trigger orders soft-delete detection BEFORE body-change
--   detection, since Wave 26's softDelete writes both `deleted_at = now()` AND
--   `body = ''` in the same UPDATE. Without the ordering, a soft-delete would
--   emit `comment_edited` instead of `comment_deleted`.
--
-- Revert path:
--   DROP TRIGGER IF EXISTS trg_log_member_change ON public.project_members;
--   DROP TRIGGER IF EXISTS trg_log_comment_change ON public.task_comments;
--   DROP TRIGGER IF EXISTS trg_log_task_change ON public.tasks;
--   DROP FUNCTION IF EXISTS public.log_member_change();
--   DROP FUNCTION IF EXISTS public.log_comment_change();
--   DROP FUNCTION IF EXISTS public.log_task_change();
--   DROP TABLE IF EXISTS public.activity_log CASCADE;

CREATE TABLE public.activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text        NOT NULL CHECK (entity_type IN ('task','comment','member','project')),
  entity_id   uuid        NOT NULL,
  action      text        NOT NULL CHECK (action IN (
    'created','updated','deleted','status_changed',
    'member_added','member_removed','member_role_changed',
    'comment_posted','comment_edited','comment_deleted'
  )),
  payload     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_project_id ON public.activity_log (project_id, created_at DESC);
CREATE INDEX idx_activity_log_entity     ON public.activity_log (entity_type, entity_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- SELECT: project members + admin
CREATE POLICY "Activity log select by project members"
ON public.activity_log
FOR SELECT
TO authenticated
USING (
  is_active_member(project_id, auth.uid())
  OR public.is_admin(auth.uid())
);

-- INSERT/UPDATE/DELETE: explicit no policy → deny by default. The trigger functions
-- below write rows via SECURITY DEFINER and bypass RLS; admin can hard-delete via
-- a future maintenance path, not this wave.

----------------------------------------------------------------
-- Trigger function: log_task_change
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_task_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_project_id uuid;
  v_action     text;
  v_payload    jsonb := '{}'::jsonb;
  v_changed    text[];
BEGIN
  v_project_id := COALESCE(NEW.root_id, OLD.root_id, NEW.id, OLD.id);

  IF TG_OP = 'INSERT' THEN
    v_action  := 'created';
    v_payload := jsonb_build_object(
      'title', NEW.title,
      'parent_task_id', NEW.parent_task_id,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_action  := 'status_changed';
      v_payload := jsonb_build_object('from', OLD.status, 'to', NEW.status);
    ELSE
      v_action := 'updated';
      v_changed := ARRAY[]::text[];
      IF NEW.title       IS DISTINCT FROM OLD.title       THEN v_changed := array_append(v_changed, 'title'); END IF;
      IF NEW.description IS DISTINCT FROM OLD.description THEN v_changed := array_append(v_changed, 'description'); END IF;
      IF NEW.start_date  IS DISTINCT FROM OLD.start_date  THEN v_changed := array_append(v_changed, 'start_date'); END IF;
      IF NEW.due_date    IS DISTINCT FROM OLD.due_date    THEN v_changed := array_append(v_changed, 'due_date'); END IF;
      IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN v_changed := array_append(v_changed, 'assignee_id'); END IF;
      IF array_length(v_changed, 1) IS NULL THEN
        RETURN COALESCE(NEW, OLD); -- no audit-worthy change
      END IF;
      v_payload := jsonb_build_object('changed_keys', v_changed);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action  := 'deleted';
    v_payload := jsonb_build_object('title', OLD.title);
  END IF;

  INSERT INTO public.activity_log (project_id, actor_id, entity_type, entity_id, action, payload)
  VALUES (v_project_id, auth.uid(), 'task', COALESCE(NEW.id, OLD.id), v_action, v_payload);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_task_change
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_change();

----------------------------------------------------------------
-- Trigger function: log_comment_change
-- ORDER MATTERS: soft-delete detection first, then body change.
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_comment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action  text;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action  := 'comment_posted';
    v_payload := jsonb_build_object('task_id', NEW.task_id, 'body_preview', substring(NEW.body, 1, 140));
  ELSIF TG_OP = 'UPDATE' THEN
    -- soft-delete first (deleted_at flipping null -> non-null)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action  := 'comment_deleted';
      v_payload := jsonb_build_object('task_id', NEW.task_id);
    ELSIF NEW.body IS DISTINCT FROM OLD.body THEN
      v_action  := 'comment_edited';
      v_payload := jsonb_build_object('task_id', NEW.task_id, 'body_preview', substring(NEW.body, 1, 140));
    ELSE
      RETURN NEW; -- no audit-worthy change
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action  := 'comment_deleted';
    v_payload := jsonb_build_object('task_id', OLD.task_id);
  END IF;

  INSERT INTO public.activity_log (project_id, actor_id, entity_type, entity_id, action, payload)
  VALUES (COALESCE(NEW.root_id, OLD.root_id), auth.uid(), 'comment', COALESCE(NEW.id, OLD.id), v_action, v_payload);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_comment_change
AFTER INSERT OR UPDATE OR DELETE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.log_comment_change();

----------------------------------------------------------------
-- Trigger function: log_member_change
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action  text;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action  := 'member_added';
    v_payload := jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role);
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    v_action  := 'member_role_changed';
    v_payload := jsonb_build_object('user_id', NEW.user_id, 'from', OLD.role, 'to', NEW.role);
  ELSIF TG_OP = 'DELETE' THEN
    v_action  := 'member_removed';
    v_payload := jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role);
  ELSE
    RETURN COALESCE(NEW, OLD); -- no audit-worthy change
  END IF;

  INSERT INTO public.activity_log (project_id, actor_id, entity_type, entity_id, action, payload)
  VALUES (COALESCE(NEW.project_id, OLD.project_id), auth.uid(), 'member', COALESCE(NEW.id, OLD.id), v_action, v_payload);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_member_change
AFTER INSERT OR UPDATE OR DELETE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.log_member_change();

REVOKE ALL ON FUNCTION public.log_task_change()    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_comment_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_member_change()  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_task_change()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_comment_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_member_change()  TO authenticated;
```

Mirror everything into `docs/db/schema.sql`.

**Generated types** — hand-add to `src/shared/db/database.types.ts` under `Database['public']['Tables']`:

```ts
activity_log: {
  Row: {
    id: string
    project_id: string
    actor_id: string | null
    entity_type: 'task' | 'comment' | 'member' | 'project'
    entity_id: string
    action:
      | 'created' | 'updated' | 'deleted' | 'status_changed'
      | 'member_added' | 'member_removed' | 'member_role_changed'
      | 'comment_posted' | 'comment_edited' | 'comment_deleted'
    payload: Json
    created_at: string
  }
  Insert: {
    id?: string
    project_id: string
    actor_id?: string | null
    entity_type: 'task' | 'comment' | 'member' | 'project'
    entity_id: string
    action: string
    payload?: Json
    created_at?: string
  }
  Update: {
    id?: string
    project_id?: string
    actor_id?: string | null
    entity_type?: 'task' | 'comment' | 'member' | 'project'
    entity_id?: string
    action?: string
    payload?: Json
    created_at?: string
  }
  Relationships: []
}
```

**Domain types** — append to `src/shared/db/app.types.ts`:

```ts
// ----------------------------------------------------------------------------
// Activity Log (Wave 27)
// ----------------------------------------------------------------------------
export type ActivityLogRow = Database['public']['Tables']['activity_log']['Row'];

export type ActivityLogWithActor = ActivityLogRow & {
  actor: {
    id: string;
    email: string;
    user_metadata?: UserMetadata;
  } | null;
};
```

**planterClient methods** — append to `src/shared/api/planterClient.ts`:

```ts
entities.ActivityLog = {
  /**
   * Project-scoped activity feed, joined with actor profile. Default limit 50;
   * pass `before` (created_at ISO string) to paginate backwards.
   */
  listByProject: (projectId: string, opts?: {
    limit?: number;
    before?: string;
    entityTypes?: ReadonlyArray<'task' | 'comment' | 'member' | 'project'>;
  }) => Promise<ActivityLogWithActor[]>,

  /** Per-task feed for the collapsed activity rail in TaskDetailsView. */
  listByEntity: (entityType: 'task' | 'comment' | 'member' | 'project', entityId: string, opts?: { limit?: number }) =>
    Promise<ActivityLogWithActor[]>,
};
```

**Hooks** — `src/features/projects/hooks/useProjectActivity.ts` (NEW):

```ts
import { useQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';

export function useProjectActivity(
  projectId: string | null,
  opts: { limit?: number; entityTypes?: ReadonlyArray<'task'|'comment'|'member'|'project'> } = {},
) {
  return useQuery({
    queryKey: ['activityLog', projectId, opts],
    queryFn: () => planter.entities.ActivityLog.listByProject(projectId!, opts),
    enabled: !!projectId,
  });
}

export function useTaskActivity(taskId: string | null, opts: { limit?: number } = {}) {
  return useQuery({
    queryKey: ['activityLog', 'task', taskId, opts],
    queryFn: () => planter.entities.ActivityLog.listByEntity('task', taskId!, opts),
    enabled: !!taskId,
  });
}
```

**UI — project-level Activity tab**:

`src/features/projects/components/ProjectActivityTab.tsx` (NEW). Renders the chronological feed grouped by day (today / yesterday / dates beyond — group via `formatDisplayDate` from `@/shared/lib/date-engine`). Each row: actor avatar (initials fallback via `<Avatar>` from `src/shared/ui/avatar.tsx`) + verb sentence + entity link. Filter chips at top: `All | Tasks | Comments | Members`. Filter is **client-side filtering of already-fetched data**, not a refetch — toggling chips never invalidates the query. Empty state: `"No activity yet — create a task or invite a teammate to get started."`. Pagination: "Load older" button at the bottom, bumps the `limit` by 50 (or refetches with `before = last.created_at`). **Do not** auto-load on scroll.

**Tab integration** — `src/features/projects/components/ProjectTabs.tsx`. Add the "Activity" tab between the existing Tasks and Resources tabs (or at the rightmost position if it composes more naturally — read the file first). Tab key: `'activity'`. Add a `PROJECT_TAB_LABELS` entry: `activity: 'Activity'` in `src/shared/constants/domain.ts`.

**UI — per-task activity rail** — `src/features/tasks/components/TaskDetailsView.tsx`. Below the Wave 26 `<TaskComments>` section, add a collapsed `<details>` titled "Activity" (default closed, `<details>` not `<details open>`). Inside: when expanded, mount `useTaskActivity(task.id, { limit: 20 })` and render the same row component as the project Activity tab. Extract the row renderer into `src/features/projects/components/ActivityRow.tsx` so both surfaces reuse it.

**Architecture doc** — append to `docs/architecture/dashboard-analytics.md` between the existing Reporting section and Integration Points:

```md
## Activity Log (Wave 27)

Append-only audit trail in `public.activity_log`. Three SECURITY DEFINER trigger
functions (`log_task_change`, `log_comment_change`, `log_member_change`) AFTER-fire
on every write to `tasks`, `task_comments`, `project_members`. Each row carries:
* `project_id` — derived from the entity (`COALESCE(NEW.root_id, OLD.root_id, NEW.id, OLD.id)` for tasks; `root_id` for comments; `project_id` for members).
* `actor_id` — `auth.uid()` at write time (NULL for server-side cron / nightly-sync).
* `entity_type` — one of `'task' | 'comment' | 'member' | 'project'`.
* `action` — one of nine values; see migration `docs/db/migrations/2026_04_18_activity_log.sql`.
* `payload` — small JSONB. **Body previews** are `substring(body, 1, 140)`, not full body.

**Comment-change trigger ordering**: soft-delete detection (`OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL`) runs **before** body-change detection. Wave 26's `softDelete` writes both `deleted_at = now()` AND `body = ''` in one UPDATE; without this ordering, a soft-delete would emit `comment_edited` instead of `comment_deleted`.

**RLS** — SELECT for project members + admin; INSERT/UPDATE/DELETE denied (no policy). Triggers bypass via SECURITY DEFINER. Admin hard-delete is a future maintenance path; not exposed in Wave 27.

**Consumers** — project tab `src/features/projects/components/ProjectActivityTab.tsx` (full feed); per-task rail in `TaskDetailsView` (collapsed `<details>`, default 20 entries).
```

**Tests**:
* `Testing/unit/shared/api/planterClient.activityLog.test.ts` (NEW) — query shapes, default limits, entity filters, the `before` cursor.
* `Testing/unit/features/projects/hooks/useProjectActivity.test.tsx` (NEW) — query-key invalidation when filters change; pagination state.
* `Testing/unit/features/projects/components/ProjectActivityTab.test.tsx` (NEW) — empty state copy; filter-chip behavior (client-side filter, no refetch); day-grouping; "Load older" button.
* Manual `psql` smoke at `docs/db/tests/activity_log_triggers.sql` — assert each of the nine actions materializes correctly. **Critical case**: soft-delete a comment (UPDATE setting both `deleted_at` and `body = ''`) → exactly one `comment_deleted` row in `activity_log`, NOT a `comment_edited` row. Header begins `-- EXPECT: nine actions × correct payload + soft-delete ordering correct`.

**DB migration?** Yes — additive (one table + 2 indexes + 3 trigger functions + 3 triggers + 1 RLS policy).

**Out of scope:** Undo / "revert this change" affordance; rich diff rendering; cross-project activity for admins (Wave 33 adds via SECURITY DEFINER RPC).

---

### Task 2 — Realtime presence cursors

**Commit:** `feat(wave-27): realtime presence + per-row focus chips on the project task list`

Use Supabase Realtime presence to show who is currently viewing a project, plus a soft-focus indicator on the task list so concurrent editors can see each other's open task. **No schema change** — pure frontend on existing realtime infrastructure.

**Channel naming convention** (locked):
* Project presence: `presence:project:<projectId>` — opens once per project route mount in `src/pages/Project.tsx`.
* No second channel for task focus — focus broadcasts piggyback on the same presence channel via `track({ ...prev, focusedTaskId })`.

**Presence hook** — `src/features/projects/hooks/useProjectPresence.ts` (NEW):

```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/shared/db/client';
import { useAuth } from '@/shared/contexts/AuthContext';

export interface PresenceState {
  user_id: string;
  email: string;
  joinedAt: number;        // ms epoch — used for stable sort and same-user dedup
  focusedTaskId: string | null;
}

export function useProjectPresence(projectId: string | null) {
  const { user } = useAuth();
  const [presentUsers, setPresentUsers] = useState<PresenceState[]>([]);
  const [myPresenceKey, setMyPresenceKey] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !user) return;
    const channel = supabase.channel(`presence:project:${projectId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        // Dedup by user_id (multiple tabs from same user collapse to earliest joinedAt)
        const byUser = new Map<string, PresenceState>();
        for (const userKey of Object.keys(state)) {
          for (const slot of state[userKey] as unknown as PresenceState[]) {
            const existing = byUser.get(slot.user_id);
            if (!existing || slot.joinedAt < existing.joinedAt) {
              byUser.set(slot.user_id, slot);
            }
          }
        }
        setPresentUsers([...byUser.values()].sort((a, b) => a.joinedAt - b.joinedAt));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            email: user.email,
            joinedAt: Date.now(),
            focusedTaskId: null,
          } satisfies PresenceState);
          setMyPresenceKey(user.id);
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      setMyPresenceKey(null);
    };
  }, [projectId, user]);

  return { presentUsers, myPresenceKey };
}
```

**Active-user chip rail** — `src/features/projects/components/PresenceBar.tsx` (NEW). Renders 1–N circular chips at the top right of the project header; uses `<Avatar>` from `src/shared/ui/avatar.tsx`. Each chip: user's initials with a subtle ring border; tooltip via `<Popover>` from `src/shared/ui/popover.tsx` shows full email + "viewing for X minutes" (`X = Math.floor((Date.now() - joinedAt) / 60000)`). Cap at 5 visible chips with a `+N` overflow chip; clicking the overflow opens a popover listing the rest. **Hide self** by default — chip with `user_id === currentUser.id` is filtered out before render.

**Mount location**: in `src/pages/Project.tsx`, render `<PresenceBar />` in the header row alongside the existing project title. Pass `presentUsers` from the hook directly via prop (no Context — single consumer).

**Task focus broadcast** — `src/features/tasks/hooks/useTaskFocusBroadcast.ts` (NEW):

```ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/shared/db/client';
import { useAuth } from '@/shared/contexts/AuthContext';

/**
 * Updates the user's presence state to include the currently-focused task id.
 * Debounced 250ms so rapid open/close/open during navigation doesn't spam the channel.
 *
 * MUST be mounted inside a route that already opened the presence channel
 * (`useProjectPresence` in `src/pages/Project.tsx`). The channel name is reconstructed
 * here from the projectId; both sides must use the same `presence:project:<id>` shape.
 */
export function useTaskFocusBroadcast(projectId: string | null, focusedTaskId: string | null) {
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!projectId || !user) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const channel = supabase.channel(`presence:project:${projectId}`);
      channel.track({
        user_id: user.id,
        email: user.email,
        joinedAt: Date.now(), // refresh on focus change is OK — sort is by min(joinedAt) per-user
        focusedTaskId,
      });
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [projectId, user, focusedTaskId]);
}
```

**Per-row focus indicator** — `src/features/tasks/components/TaskItem.tsx`. Accept a new prop `presentUsers: PresenceState[]` (passed down from `TaskList.tsx`, which receives it from `Project.tsx`). When any presence state has `focusedTaskId === thisRow.task.id`, render a small avatar chip at the row's right edge (`absolute right-2 top-1/2 -translate-y-1/2`). Tooltip: `"@email is viewing this task."` Cap at 3 chips per row with overflow chip. Filter self (`user_id === currentUser.id`) before render.

**Mount focus broadcast** — `src/features/tasks/components/TaskDetailsPanel.tsx` (the panel that opens when a task is selected). When the panel mounts with a `task`, call `useTaskFocusBroadcast(task.root_id ?? task.id, task.id)`. When the panel unmounts (task deselected), the cleanup fires — focus reverts to `null` after the next 250ms tick.

**Disabled outside `/Project/:projectId`** — only that route opens the presence channel. `/dashboard`, `/reports`, `/tasks`, `/settings` do NOT mount `useProjectPresence`.

**Architecture doc** — append to `docs/architecture/dashboard-analytics.md` after the Activity Log section:

```md
## Realtime Presence (Wave 27)

Per-project presence channel `presence:project:<id>`, opened once in `src/pages/Project.tsx` via `useProjectPresence` and consumed by `<PresenceBar>` in the project header. Each presence row carries `{ user_id, email, joinedAt, focusedTaskId }`.

**Self-hide** — the user never sees their own chip. **Multi-tab dedup** — the same `user_id` from two tabs collapses to one chip, sorted by earliest `joinedAt`.

**Task focus** — `useTaskFocusBroadcast` in `src/features/tasks/components/TaskDetailsPanel.tsx` debounces (250ms) and updates the same presence state with `focusedTaskId`. `TaskItem.tsx` reads `presentUsers` (passed from the route) and renders a chip when any peer's `focusedTaskId === task.id`. No second channel — one channel, one track call, two consumers.

**Disabled** outside the project route — Dashboard, Reports, Tasks, Settings do not open presence channels.
```

**Tests**:
* `Testing/unit/features/projects/hooks/useProjectPresence.test.tsx` (NEW) — mock `supabase.channel`; assert `track` on subscribe; assert `untrack` + `removeChannel` on unmount; presence-sync event populates `presentUsers`; same `user_id` from two tabs dedups to earliest `joinedAt`.
* `Testing/unit/features/projects/components/PresenceBar.test.tsx` (NEW) — chip overflow at >5; self-hide; tooltip content.
* `Testing/unit/features/tasks/hooks/useTaskFocusBroadcast.test.ts` (NEW) — 250ms debounce; `track` payload shape; cleanup clears timeout.

**DB migration?** No.

**Out of scope:** Mouse-cursor pointers; typing indicators in comment composer (Wave 30 if needed); persisting "last seen" timestamps to DB.

---

## Documentation Currency Pass (mandatory — before review)

`docs(wave-27): documentation currency sweep`. Operations:

1. **`spec.md`**:
   - Find `### 3.3 Tasks Domain` → flip `Collaboration Suite` from `[/]` to `[x]`. Append two sub-bullets under it: `  - [x] **Activity log (Wave 27)**: ...` and `  - [x] **Realtime presence (Wave 27)**: ...`.
   - Bump header `> **Version**: 1.11.0 ...` to `> **Version**: 1.12.0 (Wave 27 — Activity Log + Realtime Presence)`. Update `Last Updated` to today.

2. **`docs/AGENT_CONTEXT.md`** — add two golden-path bullets:
   - `**Activity Log (Wave 27)**: `entities.ActivityLog.{listByProject, listByEntity}` → `useProjectActivity` / `useTaskActivity` → `<ProjectActivityTab>` (project tab) + collapsed `<details>` rail in `TaskDetailsView`. Append-only via three SECURITY DEFINER triggers; comment-change trigger orders soft-delete BEFORE body-edit.`
   - `**Realtime Presence (Wave 27)**: per-project channel `presence:project:<id>` mounted by `useProjectPresence` in `src/pages/Project.tsx`. `<PresenceBar>` in header; per-row focus chips on `TaskItem` driven by `useTaskFocusBroadcast` (250ms debounce) — single channel, two consumers.`

3. **`docs/architecture/dashboard-analytics.md`** — Activity Log + Presence sections both in.

4. **`docs/architecture/auth-rbac.md`** — append one-liner: `**Activity Log (Wave 27)**: SELECT inherits project membership; INSERT/UPDATE/DELETE denied at policy level — only SECURITY DEFINER trigger functions write rows.`

5. **`docs/dev-notes.md`** — confirm currency. No new entries.

6. **`repo-context.yaml`**:
   - `wave_status.current: 'Wave 27 (Activity Log + Realtime Presence)'`
   - `wave_status.last_completed: 'Wave 27'`
   - `wave_status.spec_version: '1.12.0'`
   - Add `wave_27_highlights:` block listing: migration filename, three trigger function names, presence channel naming, the soft-delete-ordering invariant.

7. **`CLAUDE.md`**:
   - Add `- **`activity_log`** — Append-only audit trail. RLS by project membership; INSERT denied at policy level. Wave 27.` to the Tables list.
   - Note in §3.3 Collaboration Suite is now fully shipped (Comments + Activity + Presence).

## Wave Review (mandatory — before commit + push to main)

1. **Trigger correctness** — run the manual `psql` smoke; confirm each of the nine action types materializes. Critically: soft-delete a comment (UPDATE both `deleted_at` AND `body = ''` in one statement) → exactly one `comment_deleted` row, no `comment_edited` row. If two rows show, the trigger ordering is wrong.
2. **RLS denial paths** — try inserting into `activity_log` directly as an `auth` role (should fail). Try updating an existing row (should fail). Try selecting from a project you're not a member of (should return 0 rows).
3. **Presence dedup** — open `/Project/:id` in two tabs as the same user → confirm one chip in the bar. Close one tab → still one. Close the other → bar empties.
4. **Channel-count audit** — DevTools → Network → WS frames during a task-detail open/close cycle. Exactly one `presence:project:*` channel; no second channel for focus.
5. **Self-hide** — confirm your own avatar never appears in `<PresenceBar>` or in per-row focus chips.
6. **No FSD drift** — `useProjectPresence` lives in `features/projects/hooks/`; `useTaskFocusBroadcast` lives in `features/tasks/hooks/`. No shared imports back from features.
7. **Type drift** — `database.types.ts` was hand-edited again; do not run any types-regen script.
8. **Lint + build + tests** — green.

## Commit & Push to Main (mandatory — gates Wave 28)

After both task PRs and the docs sweep merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npm test`.
2. The new commits: 2 task commits + 1 docs sweep on top of Wave 26's 4.
3. `git push origin main`. CI green.
4. **Do not start Wave 28** until the above is true.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors, ≤7 warnings
npm run build     # clean
npm test          # baseline + new tests
git status        # clean
```

Manual smoke: see Wave Review section.

## Key references

- `CLAUDE.md` — conventions, commands
- `.gemini/styleguide.md` — strict typing, FSD, Tailwind constraints, optimistic-rollback
- `docs/architecture/dashboard-analytics.md` — host doc for both new sections
- `docs/architecture/auth-rbac.md` — `is_active_member`, `is_admin` definitions
- `docs/db/migrations/2026_04_18_task_comments.sql` — Wave 26 RLS-additive precedent
- `src/pages/Project.tsx` — Wave 27's primary integration host
- `src/features/tasks/components/TaskList.tsx` — Task 2 row-focus integration host
- Supabase Realtime presence docs — `https://supabase.com/docs/guides/realtime/presence`
- Supabase Realtime postgres_changes docs — `https://supabase.com/docs/guides/realtime/postgres-changes`

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror Task 1 migration — table + indexes + 3 trigger functions + 3 triggers + 1 RLS policy + grants)
- `docs/architecture/dashboard-analytics.md` (Activity Log + Presence sections)
- `docs/architecture/auth-rbac.md` (one-line activity log RLS note)
- `docs/AGENT_CONTEXT.md` (two Wave 27 golden-path bullets)
- `docs/dev-notes.md` (currency check)
- `src/shared/db/database.types.ts` (hand-add `activity_log` block)
- `src/shared/db/app.types.ts` (`ActivityLogRow`, `ActivityLogWithActor`)
- `src/shared/api/planterClient.ts` (`entities.ActivityLog` namespace)
- `src/shared/constants/domain.ts` (add `activity` to `PROJECT_TABS` + `PROJECT_TAB_LABELS`)
- `src/features/tasks/components/TaskDetailsView.tsx` (per-task activity rail `<details>`)
- `src/features/tasks/components/TaskDetailsPanel.tsx` (mount `useTaskFocusBroadcast`)
- `src/features/tasks/components/TaskItem.tsx` (presence-driven focus chip; accept new `presentUsers` prop)
- `src/features/tasks/components/TaskList.tsx` (forward `presentUsers` prop down)
- `src/pages/Project.tsx` (mount `useProjectPresence` + `<PresenceBar>`; pass `presentUsers` to `TaskList`)
- `src/features/projects/components/ProjectTabs.tsx` (add Activity tab)
- `spec.md` (flip §3.3 Collaboration Suite to `[x]`, bump to 1.12.0)
- `repo-context.yaml` (Wave 27 highlights)
- `CLAUDE.md` (activity_log row in Tables)

**Will create:**
- `docs/db/migrations/2026_04_18_activity_log.sql`
- `docs/db/tests/activity_log_triggers.sql`
- `src/features/projects/components/ProjectActivityTab.tsx`
- `src/features/projects/components/ActivityRow.tsx` (reused by tab + per-task rail)
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
- Cross-project activity for admins (Wave 33)
- Push notifications driven by activity events (Wave 30)
- Activity log retention / archival policy
- Server-side aggregation / "X tasks updated by Y this week" rollups (Wave 33)

## Ground Rules

TypeScript only; no `.js`/`.jsx`; no barrel files; `@/` → `src/`, `@test/` → `Testing/test-utils`; no raw date math (group activity by day via `formatDisplayDate` from `@/shared/lib/date-engine`); no direct `supabase.from()` in components — go through `planter.entities.ActivityLog.*`; Tailwind utilities only (no arbitrary values, no pure black — slate-900/zinc-900); brand button uses `bg-brand-600 hover:bg-brand-700`; presence is read-only — no optimistic mutations to roll back; max subtask depth = 1; template vs instance: activity log captures both; **zero new npm dependencies** — Supabase Realtime is already bundled; atomic revertable commits; build + lint + tests clean before every push; DB migrations are additive-only.
