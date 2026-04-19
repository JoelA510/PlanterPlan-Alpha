## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 25 shipped to `main`:
- `c17ce49 feat(wave-25): surface topically related Master Library templates in the Strategy follow-up flow`
- `b770209 feat(wave-25): add task_type discriminator column + BEFORE trigger + backfill`
- `4f48b53 feat(wave-25): ProjectSwitcher reveals completed projects behind a toggle`

Spec is at **1.10.1**. §6 Backlog is empty (every Wave 22/23/24 carve-out shipped, the `task_type` discriminator dev-note is closed, and the §3.5 Library Integration loop is fully wired).

Wave 26 opens the §3.3 Collaboration Suite by shipping its **first** column: threaded task comments. Activity log + realtime presence land in Wave 27 on top of this foundation.

**Test baseline going into Wave 26:** Wave 25 shipped at ≥547 tests across ≥47 files. **At the start of this wave, run `npm test` (which runs `vitest --run`) and record the actual count as the starting baseline. Use that number for the verification gate at the end.** Lint baseline: 0 errors, 7 pre-existing warnings — do not regress.

**Read `.claude/wave-testing-strategy.md` before starting.** It catalogs the existing test infrastructure and per-wave test impact across all of Waves 26-38. Wave 26 specifically: the four existing `Testing/unit/features/tasks/components/TaskDetailsView.*.test.tsx` files will throw on missing `useTaskComments` data unless you add `vi.mock('@/features/tasks/hooks/useTaskComments', () => ({ useTaskComments: () => ({ data: [], isLoading: false }) }))` (and a matching no-op for `useTaskCommentsRealtime`) to each. Add these mock injections as part of Task 2's commit so existing tests stay green after the `<TaskComments>` mount lands in `TaskDetailsView.tsx`.

## Pre-flight verification (run before any task)

Sonnet-friendly drift check. Verify these facts hold on `main` before touching anything. If any fact is wrong, STOP and report — the wave plan was written against a snapshot and assumes them.

1. `git log --oneline -5` first commit reads `4f48b53 feat(wave-25): ProjectSwitcher reveals completed projects behind a toggle`.
2. These files exist:
   - `src/features/tasks/components/TaskDetailsView.tsx`
   - `src/features/tasks/components/TaskList.tsx`
   - `src/features/tasks/hooks/useTaskSiblings.ts`
   - `src/features/tasks/hooks/useTaskMutations.ts`
   - `src/shared/api/planterClient.ts`
   - `src/shared/contexts/AuthContext.tsx`
   - `src/shared/db/app.types.ts`
   - `src/shared/db/database.types.ts`
   - `src/pages/Project.tsx`
   - `src/shared/ui/avatar.tsx`
   - `src/shared/ui/button.tsx`
   - `src/shared/ui/textarea.tsx`
   - `src/shared/ui/dialog.tsx`
   - `docs/db/schema.sql`
   - `docs/architecture/tasks-subtasks.md`
   - `docs/architecture/auth-rbac.md`
3. `src/shared/api/planterClient.ts` exposes `entities.Task.listSiblings(taskId)` (Wave 21.5 precedent for `entities.TaskComment`).
4. `src/shared/contexts/AuthContext.tsx` exposes `user`, `loading`, `signUp`, `signIn`, `signOut`, `updateMe`, `savedEmailAddresses`, `rememberEmailAddress`.
5. `src/shared/db/database.types.ts` lists tables `admin_users, people, project_invites, project_members, rag_chunks, task_relationships, task_resources, tasks` under `Database['public']['Tables']`. (Note: there are **8** existing tables; Wave 26 adds a 9th.)
6. `docs/db/schema.sql` already has `is_active_member`, `is_admin`, `check_project_ownership_by_role`, and `handle_updated_at` defined — the new policies and triggers below reuse them.
7. Routes live in `src/app/App.tsx` (NOT `src/app/router.tsx`). Provider wrapping order: `QueryClientProvider` → `AuthProvider` → `BrowserRouter` → `Toaster`.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-26-comments-schema`
- Task 2 → `claude/wave-26-comments-ui`
- Task 3 → `claude/wave-26-comments-realtime`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 26 scope

Three tightly scoped tasks delivering the threaded-comments half of the §3.3 Collaboration Suite. Activity log + realtime presence are explicitly out of scope (Wave 27).

---

### Task 1 — Schema + RLS for `task_comments`

**Commit:** `feat(wave-26): task_comments table + threading + RLS`

**Migration file**: `docs/db/migrations/2026_04_18_task_comments.sql` (NEW)

Use this exact DDL (header includes the revert path; inline comments documented for future readers):

```sql
-- Migration: Wave 26 — task_comments table
-- Date: 2026-04-18
-- Description:
--   First column of the §3.3 Collaboration Suite. Adds a threaded comments table
--   scoped to project membership via tasks.root_id, with soft-delete semantics so
--   the Wave 27 activity log can report deletion events without losing the row.
--
--   Threading is unbounded at the DB layer (`parent_comment_id` is a self-FK with
--   no depth check) — the UI in Wave 26 Task 2 enforces a 1-level visual cap with
--   reply-to-reply chain-lift. This split keeps the data faithful while keeping
--   the UI predictable.
--
-- Revert path:
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.task_comments;
--   DROP TABLE IF EXISTS public.task_comments CASCADE;
--   DROP FUNCTION IF EXISTS public.set_task_comments_root_id();

CREATE TABLE public.task_comments (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           uuid          NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  root_id           uuid          NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  parent_comment_id uuid          REFERENCES public.task_comments(id) ON DELETE CASCADE,
  author_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body              text          NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000),
  mentions          text[]        NOT NULL DEFAULT ARRAY[]::text[],
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  edited_at         timestamptz,
  deleted_at        timestamptz
);

CREATE INDEX idx_task_comments_task_id           ON public.task_comments (task_id, created_at DESC);
CREATE INDEX idx_task_comments_root_id           ON public.task_comments (root_id, created_at DESC);
CREATE INDEX idx_task_comments_parent_comment_id ON public.task_comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- root_id auto-fill (mirrors the set_root_id_from_parent pattern on public.tasks)
CREATE OR REPLACE FUNCTION public.set_task_comments_root_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_root uuid;
BEGIN
  SELECT COALESCE(t.root_id, t.id) INTO v_root
  FROM public.tasks t
  WHERE t.id = NEW.task_id;
  IF v_root IS NULL THEN
    RAISE EXCEPTION 'task_comments: parent task % not found', NEW.task_id;
  END IF;
  NEW.root_id := v_root;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_comments_root_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_task_comments_root_id() TO authenticated;

CREATE TRIGGER trg_task_comments_set_root_id
BEFORE INSERT ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_task_comments_root_id();

CREATE TRIGGER trg_task_comments_handle_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Realtime publication add (required for Task 3's channel subscription)
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: any project member, plus admin
CREATE POLICY "Comments select by project members"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  is_active_member(root_id, auth.uid())
  OR public.is_admin(auth.uid())
);

-- INSERT: any project member; author must be self
CREATE POLICY "Comments insert by project members"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    is_active_member(root_id, auth.uid())
    OR public.is_admin(auth.uid())
  )
);

-- UPDATE: author edits own undeleted comments only; immutable fields enforced via WITH CHECK
CREATE POLICY "Comments update by author"
ON public.task_comments
FOR UPDATE
TO authenticated
USING (
  (author_id = auth.uid() AND deleted_at IS NULL)
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  task_id           = (SELECT task_id           FROM public.task_comments WHERE id = task_comments.id)
  AND root_id       = (SELECT root_id           FROM public.task_comments WHERE id = task_comments.id)
  AND parent_comment_id IS NOT DISTINCT FROM (SELECT parent_comment_id FROM public.task_comments WHERE id = task_comments.id)
  AND author_id     = (SELECT author_id         FROM public.task_comments WHERE id = task_comments.id)
);

-- DELETE: author, project owner, or admin (soft-delete preferred via UPDATE)
CREATE POLICY "Comments delete by author or owner"
ON public.task_comments
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR public.check_project_ownership_by_role(root_id, auth.uid())
  OR public.is_admin(auth.uid())
);
```

**Mirror into `docs/db/schema.sql`** at the end of the table definitions block, then append the trigger functions / triggers / policies in sequence to match the migration's order.

**Generated types** — hand-add to `src/shared/db/database.types.ts` under `Database['public']['Tables']` (mirrors how Waves 23/24/25 hand-edited when types lagged the DB). Use this exact block:

```ts
task_comments: {
  Row: {
    id: string
    task_id: string
    root_id: string
    parent_comment_id: string | null
    author_id: string
    body: string
    mentions: string[]
    created_at: string
    updated_at: string
    edited_at: string | null
    deleted_at: string | null
  }
  Insert: {
    id?: string
    task_id: string
    root_id?: string
    parent_comment_id?: string | null
    author_id: string
    body: string
    mentions?: string[]
    created_at?: string
    updated_at?: string
    edited_at?: string | null
    deleted_at?: string | null
  }
  Update: {
    id?: string
    task_id?: string
    root_id?: string
    parent_comment_id?: string | null
    author_id?: string
    body?: string
    mentions?: string[]
    created_at?: string
    updated_at?: string
    edited_at?: string | null
    deleted_at?: string | null
  }
  Relationships: []
}
```

**Domain types** — append to `src/shared/db/app.types.ts` after the `TaskResource` block:

```ts
// ----------------------------------------------------------------------------
// Comments (Wave 26)
// ----------------------------------------------------------------------------
export type TaskCommentRow    = Database['public']['Tables']['task_comments']['Row'];
export type TaskCommentInsert = Database['public']['Tables']['task_comments']['Insert'];
export type TaskCommentUpdate = Database['public']['Tables']['task_comments']['Update'];

/** Task comment row joined with author profile for UI rendering. */
export type TaskCommentWithAuthor = TaskCommentRow & {
  author: {
    id: string;
    email: string;
    user_metadata?: UserMetadata;
  } | null;
};
```

**Architecture doc** — append to `docs/architecture/tasks-subtasks.md` between the Strategy Templates section and Integration Points:

```md
## Comments (Wave 26)

Threaded task comments live in `public.task_comments`. Each row carries
`task_id` (the comment's target), `root_id` (auto-filled from the parent
task's root via `trg_task_comments_set_root_id`, mirrors the
`set_root_id_from_parent` pattern on `public.tasks`), and an optional
`parent_comment_id` self-FK for replies. The DB places **no depth cap** on
threading — the UI in `src/features/tasks/components/TaskComments/`
enforces a single-level visual nest with chain-lift for reply-to-reply.

**Soft-delete contract**: callers issue `UPDATE ... SET deleted_at = now(),
body = ''` (clearing the body to scrub the cached query payload).
`useTaskComments` filters `deleted_at IS NULL` by default. Hard `DELETE` is
reserved for admin/cleanup paths.

**RLS** (migration `docs/db/migrations/2026_04_18_task_comments.sql`):
* SELECT — any project member via `is_active_member(root_id, auth.uid())`.
* INSERT — any project member; `author_id` pinned to `auth.uid()` via
  `WITH CHECK`.
* UPDATE — author of the comment, undeleted only. Immutable fields:
  `task_id`, `root_id`, `parent_comment_id`, `author_id`.
* DELETE — author, project owner (`check_project_ownership_by_role`), or
  admin.

**Realtime** — table is in the `supabase_realtime` publication; the
per-task channel in `src/features/tasks/hooks/useTaskCommentsRealtime.ts`
invalidates `['taskComments', taskId]` on any payload.
```

**Architecture cross-ref** — append a single line to `docs/architecture/auth-rbac.md` under "Resolved" or "Business Rules":

```md
**Comments (Wave 26):** SELECT inherits project membership; INSERT requires `author_id = auth.uid()`; UPDATE restricted to authors on undeleted rows; DELETE allowed for authors, project owners (`check_project_ownership_by_role`), or admins. Full policy text in `docs/architecture/tasks-subtasks.md`.
```

**Tests** — manual `psql` smoke at `docs/db/tests/task_comments_rls.sql` (NEW) covering each policy under four personas (owner, editor, viewer, non-member) plus the soft-delete vs. hard-delete branches and `set_task_comments_root_id` correctness on a comment posted directly to a phase row vs. a leaf task. Header begins `-- EXPECT: every persona-row pair returns the documented oracle`.

**DB migration?** Yes — additive (one table + 3 indexes + 1 function + 2 triggers + 4 policies + publication add). Revert path in the migration header.

**Out of scope:** Mention resolution to `auth.users` rows (Task 2 stores raw `@handle` strings in `mentions[]`; resolution to uuids is Wave 30); markdown rendering; file attachments; emoji reactions; activity log / presence (Wave 27).

---

### Task 2 — Comments UI + planterClient methods

**Commit:** `feat(wave-26): TaskComments component + planterClient.entities.TaskComment`

Wires read + write UX into the existing task detail surface. No new route — comments live inside `TaskDetailsView.tsx` directly below the Wave 21.5 "Related Tasks" section.

**1. planterClient methods** — append to `src/shared/api/planterClient.ts` after the existing `entities.TaskRelationship` block. Follow the existing entity pattern (extend `EntityClient` if appropriate; otherwise hand-roll like `entities.TaskWithResources`). Required surface:

```ts
entities.TaskComment = {
  // RLS handles project-membership filtering. By default deleted_at IS NULL is filtered;
  // pass { includeDeleted: true } to surface soft-deleted rows for the Wave 27 audit log.
  listByTask: (taskId: string, opts?: { includeDeleted?: boolean }) => Promise<TaskCommentWithAuthor[]>,

  // author_id is server-pinned by RLS WITH CHECK. Returns the row joined with author.
  create: (payload: {
    task_id: string;
    parent_comment_id?: string | null;
    body: string;
    mentions?: string[];
  }) => Promise<TaskCommentWithAuthor>,

  // updated_at + edited_at are server-set by trg_task_comments_handle_updated_at.
  // The trigger sets updated_at; the planterClient method also writes edited_at = now().
  updateBody: (commentId: string, payload: { body: string; mentions?: string[] }) => Promise<TaskCommentRow>,

  // Soft-delete: UPDATE ... SET deleted_at = now(), body = ''. Clears the body so cached
  // query results don't leak content post-delete.
  softDelete: (commentId: string) => Promise<TaskCommentRow>,
};
```

The `listByTask` SELECT must hydrate the author by selecting `*, author:users(id, email, user_metadata)` (or the closest equivalent the existing planterClient already uses for user joins — grep `select(.*users\(`).

**2. Hook** — `src/features/tasks/hooks/useTaskComments.ts` (NEW):

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { planter } from '@/shared/api/planterClient';
import type { TaskCommentWithAuthor } from '@/shared/db/app.types';

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => planter.entities.TaskComment.listByTask(taskId!),
    enabled: !!taskId,
  });
}

export function useCreateComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { parent_comment_id?: string | null; body: string; mentions: string[] }) =>
      planter.entities.TaskComment.create({ task_id: taskId, ...payload }),
    // Optimistic insert with temp uuid; rollback + force-refetch on error per styleguide §5.
    onMutate: async (payload) => { /* snapshot prev, optimistic add, return ctx */ },
    onError: (_err, _vars, ctx) => {
      // Force-refetch on rollback (styleguide §5 mandate).
      qc.invalidateQueries({ queryKey: ['taskComments', taskId] });
      toast.error('Could not post comment');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['taskComments', taskId] }),
  });
}

export function useUpdateComment(taskId: string) { /* same shape as useCreateComment */ }
export function useDeleteComment(taskId: string) { /* soft-delete via planter.entities.TaskComment.softDelete */ }
```

All three mutation hooks **must** include the rollback `qc.invalidateQueries(...)` in `onError` per `.gemini/styleguide.md` §5 ("optimistic mutations must force-refetch in catch block").

**3. Mention parser** — `src/features/tasks/lib/comment-mentions.ts` (NEW):

```ts
/**
 * Extract @-mentions from a comment body.
 *
 * Wave 26 stores raw handles (the literal text after '@'); Wave 30 resolves
 * each handle to an auth.users row id and writes the uuid array. The two-step
 * design lets the comment composer ship before the notification stack exists.
 *
 * @param body Raw comment text.
 * @returns Unique handles, lowercased, trimmed of trailing punctuation, in
 *   first-occurrence order.
 */
export function extractMentions(body: string): string[] {
  const matches = body.matchAll(/@([a-zA-Z0-9_.\-]+)/g);
  const handles = new Set<string>();
  for (const m of matches) {
    const h = m[1].replace(/[.\-_]+$/, '').toLowerCase();
    if (h.length > 0) handles.add(h);
  }
  return [...handles];
}
```

**4. UI components** — new directory `src/features/tasks/components/TaskComments/` with four files (no barrel — import each directly):

| File | Responsibility |
| --- | --- |
| `TaskComments.tsx` | Top-level composition. Props: `{ taskId: string }`. Mounts `useTaskComments`, `useTaskCommentsRealtime` (Task 3), `useCreateComment`. Renders compose form + list + empty state. |
| `CommentList.tsx` | Consumes `TaskCommentWithAuthor[]`. Groups top-level comments (`parent_comment_id IS NULL`); renders each with replies underneath. **UI-side depth cap = 1**: replies-to-replies render at the same indent as their grandparent reply, with a `↪ in reply to @author` chip pulled from the `author.email` of the immediate parent. |
| `CommentItem.tsx` | One comment row. Avatar (initials fallback via `<Avatar>` from `src/shared/ui/avatar.tsx`), body, "Edited" suffix when `edited_at !== null`, edit/delete affordances visible only when `comment.author_id === currentUser.id`, reply button. |
| `CommentComposer.tsx` | `<Textarea>` + Send button + `Esc` to cancel + `Cmd/Ctrl+Enter` to submit. `react-hook-form` + zod (`body: z.string().trim().min(1).max(10000)`). On submit: call `extractMentions(body)`, then `useCreateComment.mutate({ parent_comment_id, body, mentions })`. |

Styling: reuse the existing card pattern from `TaskDetailsView.tsx` (`bg-white border border-slate-200 rounded-xl shadow-sm`) and the brand button from `src/index.css` (`.btn-primary` → `bg-brand-600 hover:bg-brand-700`). **No arbitrary Tailwind values.** **No pure black** — slate-900 / zinc-900 only.

**5. Integration** — `src/features/tasks/components/TaskDetailsView.tsx`:
* Mount `<TaskComments taskId={task.id} />` directly below the existing "Related Tasks" section. The exact location: after the `<RelatedTasks>` JSX block, before the existing footer/actions row. **Read the file first to find the precise insertion point** — don't guess.
* Add a comment count chip next to the section heading: `<span className="text-sm text-slate-500">{count} comments</span>`. The count comes from the same `useTaskComments` query already mounted by `<TaskComments>` — pass it down as a prop OR call the hook a second time (React Query dedupes, so either is fine).
* Empty state copy (rendered inside `TaskComments` when `comments.length === 0`): `"No comments yet — be the first to add one."`

**6. Tests** — every new file gets a mirror test. Use `@test/` alias for shared test utilities.

| Source path | Test path |
| --- | --- |
| `src/shared/api/planterClient.ts` (TaskComment block) | `Testing/unit/shared/api/planterClient.taskComments.test.ts` |
| `src/features/tasks/lib/comment-mentions.ts` | `Testing/unit/features/tasks/lib/comment-mentions.test.ts` |
| `src/features/tasks/hooks/useTaskComments.ts` | `Testing/unit/features/tasks/hooks/useTaskComments.test.tsx` |
| `src/features/tasks/components/TaskComments/TaskComments.tsx` | `Testing/unit/features/tasks/components/TaskComments/TaskComments.test.tsx` |

Coverage requirements:
* `planterClient.taskComments.test.ts` — query shape for `listByTask` (default vs `includeDeleted: true`); `create` payload shape; `softDelete` writes both `deleted_at` and `body = ''`.
* `comment-mentions.test.ts` — empty body; no mentions; one mention; multiple mentions; duplicates dedup; trailing-punctuation trim (`@joe.` → `joe`); adjacency (`@@joe` → `joe`); first-occurrence order preserved.
* `useTaskComments.test.tsx` — optimistic insert; **rollback fires `invalidateQueries` on error**; cache key shape.
* `TaskComments.test.tsx` — empty state copy; threaded list with replies grouped under parents; reply-to-reply renders at depth-1 with the in-reply-to chip; edit/delete affordances visible only for own comments; soft-deleted rows hidden from default render.

**DB migration?** No — Task 1 owns the schema.

**Out of scope:** Markdown / rich-text rendering; file attachments; reactions; mention-uuid resolution (Wave 30).

---

### Task 3 — Realtime invalidation for comments

**Commit:** `feat(wave-26): subscribe to task_comments realtime channel for live updates`

The `task_comments` table is now in the realtime publication (Task 1). Wire a per-task channel that invalidates the React Query cache when a remote insert/update/delete arrives, so two users editing the same task see each other's comments without a manual refresh.

**1. Subscription hook** — `src/features/tasks/hooks/useTaskCommentsRealtime.ts` (NEW):

```ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';

export function useTaskCommentsRealtime(taskId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!taskId) return;
    const channel = supabase
      .channel(`task_comments:task=${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['taskComments', taskId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, qc]);
}
```

**Do not** attempt to merge the realtime payload into the cache manually — the realtime payload doesn't include the joined author column. Invalidation is cheap and correct.

**2. Wire into `TaskComments.tsx`** — call `useTaskCommentsRealtime(taskId)` at the top of the component, sibling of the data hook. **No-op when `taskId === null`** so the hook can be called unconditionally.

**3. Channel scope note** — `src/pages/Project.tsx` already opens a project-scoped task realtime channel (verify with `grep -n 'supabase.channel' src/pages/Project.tsx` before editing). Do **not** add comments-on-`tasks` filtering there; comments live at the per-task channel level so they're not noisy when the panel is closed. Add a one-line comment near the existing channel setup in `Project.tsx`:

```ts
// Comments use a per-task channel mounted by TaskComments — see useTaskCommentsRealtime. Don't merge here.
```

**4. AGENT_CONTEXT.md** — add a new "Comments (Wave 26)" golden-path bullet describing the data flow:

```md
- **Comments (Wave 26)**: `TaskDetailsView.tsx` mounts `<TaskComments taskId>` →
  `useTaskComments` (`['taskComments', taskId]`) + `useTaskCommentsRealtime`
  (channel `task_comments:task=:id`) → `planter.entities.TaskComment.{listByTask, create, updateBody, softDelete}`
  → `public.task_comments` (RLS by project membership). UI caps reply nesting
  at 1 level via chain-lift; DB allows arbitrary depth. Soft-delete clears body.
```

**5. Tests** — `Testing/unit/features/tasks/hooks/useTaskCommentsRealtime.test.ts` (NEW):
* Mocks `supabase.channel(...)` chain.
* Asserts INSERT / UPDATE / DELETE payloads each fire one `invalidateQueries({ queryKey: ['taskComments', taskId] })`.
* Asserts `removeChannel` called on unmount.
* Asserts `taskId === null` → no `channel(...)` call.

**DB migration?** No — publication add is part of Task 1.

**Out of scope:** Optimistic UI for *remote* writes (we just invalidate); presence cursors (Wave 27); typing indicators (Wave 27 / 30 territory).

---

## Documentation Currency Pass (mandatory — before review)

Run as a single `docs(wave-26): documentation currency sweep` commit on a `claude/wave-26-docs` branch (or fold into Task 3's branch — operator's choice; default to a separate branch for cleanest review).

Each item below has an explicit edit operation. Do them all.

1. **`spec.md`**:
   - Find `### 3.3 Tasks Domain` section → flip `[ ] **Collaboration Suite**: ...` from `[ ]` to `[/]` (in progress).
   - Append a sub-bullet under it: `  - [x] **Threaded comments (Wave 26)**: `task_comments` table + `<TaskComments>` in `TaskDetailsView.tsx`. Soft-delete; UI-side 1-level nest cap; `useTaskCommentsRealtime` for live sync.`
   - Header lines: bump `> **Version**: 1.10.1 ...` to `> **Version**: 1.11.0 (Wave 26 — Threaded Comments)`. Update `> **Last Updated**: 2026-XX-XX` to today.

2. **`docs/AGENT_CONTEXT.md`** — add the bullet from Task 3 step 4 to the Golden Paths list (alphabetically near "Coaching task tagging").

3. **`docs/architecture/tasks-subtasks.md`** — Task 1's `## Comments (Wave 26)` section is in.

4. **`docs/architecture/auth-rbac.md`** — Task 1's one-line cross-ref is in.

5. **`docs/dev-notes.md`** — no entry expected. If the existing list has any "Active" entries that are actually closed by prior waves, prune.

6. **`repo-context.yaml`**:
   - `wave_status.current: 'Wave 26 (Threaded Comments)'`
   - `wave_status.last_completed: 'Wave 26'`
   - `wave_status.spec_version: '1.11.0'`
   - Add a `wave_26_highlights:` block (yaml list) listing: migration filename, `entities.TaskComment` namespace, `useTaskComments` + `useTaskCommentsRealtime` hooks, the per-task realtime channel naming, the soft-delete contract.

7. **`CLAUDE.md`**:
   - Under "Schema Overview" Tables list, add: `- **`task_comments`** — Threaded comments per task. RLS by project membership; soft-delete via `deleted_at`. Wave 26.`
   - Under "RLS Policy Pattern", add a one-liner about the comments INSERT divergence: `- **`task_comments`**: INSERT allowed for any project member (not just owner/editor) — comments are a collaboration surface, not a structural mutation.`

## Wave Review (mandatory — before commit + push to main)

Self-PR-review pass. Do this BEFORE pushing the docs sweep commit, in addition to the per-task verification gates below.

1. **Schema review** — does the migration header carry: description, revert path, cross-ref to `docs/db/schema.sql`? Did you mirror every object into `schema.sql` verbatim? Run `git diff docs/db/schema.sql` and confirm one new table + 3 indexes + 1 function + 2 triggers + 4 policies + the publication ALTER appear.
2. **RLS coverage** — for each of the four policies, name the persona scenarios it gates (owner / editor / coach / viewer / non-member / admin) and confirm the smoke script in `docs/db/tests/task_comments_rls.sql` exercises each.
3. **App-layer correctness** — `useCreateComment`, `useUpdateComment`, `useDeleteComment` each have `onError` that calls `qc.invalidateQueries(...)` per `.gemini/styleguide.md` §5. Grep: `grep -n 'invalidateQueries' src/features/tasks/hooks/useTaskComments.ts` should return ≥3 lines.
4. **Realtime cleanup** — open a task in dev → close → open another. Browser DevTools → Network → WS frames: confirm only one `task_comments:task=*` channel is open at a time and unsubscribed channels close cleanly.
5. **No FSD drift** — `useTaskComments` lives in `src/features/tasks/hooks/`. No barrel files. `shared/` has no imports from `features/`. Grep: `grep -r "from '@/features" src/shared/` should return zero results.
6. **Type drift** — `database.types.ts` was hand-edited in Task 1. Do **not** run `npm run generate:types` (or any equivalent script if one exists in `package.json`) after the edit — it would overwrite the addition. Verify `git diff src/shared/db/database.types.ts` shows only the `task_comments` block addition.
7. **Test coverage** — `find Testing/unit/features/tasks -name "*comment*"` should return all four planned test files. Snapshot the test count delta in the PR description (target: +20 tests minimum).
8. **Test-impact reconciled** — every "existing test at risk" listed in `.claude/wave-testing-strategy.md` §3 (Wave 26) has been mocked/extended; no `it.skip` or `describe.skip` introduced; test count ≥ baseline + new tests added.
9. **Lint + build + tests** — `npm run lint` (0 errors, ≤7 warnings), `npm run build` (clean), `npm test` (100% pass rate; HALT if any failure per `.claude/wave-execution-protocol.md` §3 + §4).

## Commit & Push to Main (mandatory — gates Wave 27)

After all task PRs and the docs sweep commit are merged:

1. `git checkout main && git pull && npm install && npm run lint && npm run build && npm test`.
2. The new commits on `main` should be: 3 task commits (Task 1, 2, 3) + 1 docs sweep commit on top of `4f48b53`.
3. `git log --oneline main..origin/main` returns empty (nothing pending push).
4. `git push origin main` if any commits aren't yet pushed. Wait for any CI to pass.
5. **Do not start Wave 27** until all of the above is green.

## Verification Gate (per task, before push)

**Every command below is a HALT condition per `.claude/wave-execution-protocol.md` §4. If any check fails, STOP — do not push, do not advance to the next task. Diagnose and fix per the protocol.**

```bash
npm run lint      # 0 errors required (≤7 pre-existing warnings tolerated). FAIL → HALT.
npm run build     # clean tsc -b && vite build. FAIL → HALT.
npm test          # 100% pass rate; count ≥ baseline + new tests. FAIL → HALT.
git status        # clean
```

Manual smoke checks (dev server + local Supabase via `supabase start`):
- **Task 1:** `psql $DB_URL -c "\d public.task_comments"` shows the table + indexes; `\dp public.task_comments` shows 4 policies; `SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_comments'` returns one row.
- **Task 2:** open any task detail → "Comments" section renders with the empty state. Post a top-level comment → appears immediately. Reply → appears nested under the parent. Reply-to-reply → appears at depth-1 with the in-reply-to chip. Edit own comment → `edited_at` populates and the UI shows an "(edited)" suffix. Delete → comment disappears from the default render. Open the same task as a non-member of the project → 0 comments + no compose form.
- **Task 3:** open the task in two browser windows (different users on the same project — use the seeded `crossway-network` test users if Wave 19's seed scripts were preserved; otherwise create two test users via Supabase Studio). Post a comment in window A → window B's list refreshes within 2 seconds without a manual reload. Edit + delete behave the same way.

## Key references (read these BEFORE writing code)

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values, optimistic-rollback rule
- `docs/architecture/tasks-subtasks.md` — domain SSoT for tasks; Task 1 appends to this
- `docs/architecture/auth-rbac.md` — `is_active_member`, `is_admin`, `check_project_ownership_by_role` definitions
- `docs/AGENT_CONTEXT.md` — Wave 26 adds a golden-path bullet
- `docs/db/schema.sql` — SSoT for DB objects; mirror the migration here
- `docs/db/migrations/2026_04_17_coaching_task_rls.sql` — additive-policy precedent (Wave 22)
- `docs/db/migrations/2026_04_18_task_type_discriminator.sql` — column + index + trigger + function precedent (Wave 25)
- `src/features/tasks/hooks/useTaskSiblings.ts` — Wave 21.5 task-scoped hook precedent (mirror its shape for `useTaskComments`)
- `src/features/tasks/components/TaskDetailsView.tsx` — Task 2 mounts `<TaskComments>` here
- `src/shared/api/planterClient.ts` — `entities.Task.listSiblings` (Wave 21.5) is the closest precedent for `entities.TaskComment` shape; grep the file for `listSiblings` to find the surrounding namespace pattern
- `src/pages/Project.tsx` — existing realtime channel setup; Task 3 leaves a one-line comment about the channel split
- Supabase Realtime docs — `https://supabase.com/docs/guides/realtime/postgres-changes`

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror Task 1 migration)
- `docs/architecture/tasks-subtasks.md` (Comments section)
- `docs/architecture/auth-rbac.md` (one-line cross-reference)
- `docs/AGENT_CONTEXT.md` (Wave 26 golden-path bullet)
- `docs/dev-notes.md` (currency check; likely no edit)
- `src/shared/db/database.types.ts` (hand-add `task_comments` block — exact code given above)
- `src/shared/db/app.types.ts` (`TaskCommentRow/Insert/Update`, `TaskCommentWithAuthor` — exact code given above)
- `src/shared/api/planterClient.ts` (`entities.TaskComment` namespace)
- `src/features/tasks/components/TaskDetailsView.tsx` (mount `<TaskComments>`; add count chip)
- `src/pages/Project.tsx` (one-line comment about channel split)
- `spec.md` (flip §3.3 to `[/]` + sub-bullet, bump to 1.11.0)
- `repo-context.yaml` (Wave 26 highlights block)
- `CLAUDE.md` (`task_comments` row in Tables; INSERT-divergence note in RLS Policy Pattern)

**Will create:**
- `docs/db/migrations/2026_04_18_task_comments.sql`
- `docs/db/tests/task_comments_rls.sql`
- `src/features/tasks/components/TaskComments/TaskComments.tsx`
- `src/features/tasks/components/TaskComments/CommentList.tsx`
- `src/features/tasks/components/TaskComments/CommentItem.tsx`
- `src/features/tasks/components/TaskComments/CommentComposer.tsx`
- `src/features/tasks/hooks/useTaskComments.ts`
- `src/features/tasks/hooks/useTaskCommentsRealtime.ts`
- `src/features/tasks/lib/comment-mentions.ts`
- `Testing/unit/shared/api/planterClient.taskComments.test.ts`
- `Testing/unit/features/tasks/lib/comment-mentions.test.ts`
- `Testing/unit/features/tasks/hooks/useTaskComments.test.tsx`
- `Testing/unit/features/tasks/hooks/useTaskCommentsRealtime.test.ts`
- `Testing/unit/features/tasks/components/TaskComments/TaskComments.test.tsx`

**Explicitly out of scope this wave:**
- Activity log / audit trail (Wave 27)
- Realtime presence cursors / typing indicators (Wave 27)
- Mention resolution to `auth.users` rows + notifications on @-mention (Wave 30 — needs the Wave 30 notification stack)
- Markdown / rich-text rendering, file attachments, emoji reactions
- A separate `task_comments` per-flag RLS pattern (no equivalent need; SELECT scope is project-membership)

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/` (use `@test/` for `Testing/test-utils` imports); no raw date math (comments use `created_at`/`updated_at`/`edited_at` ISO strings; format via `formatDisplayDate` from `@/shared/lib/date-engine`); no direct `supabase.from()` in components — go through `planter.entities.TaskComment.*`; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); brand button uses `bg-brand-600 hover:bg-brand-700` (mirrors `.btn-primary` in `src/index.css`); optimistic mutations must force-refetch in `onError` — every `useMutation` in this wave gets `onError: () => qc.invalidateQueries(...)`; max subtask depth = 1 (does not apply to comment threading — DB has no depth cap, UI caps at 1); template vs instance: comments only attach to instance tasks in practice (UI mounts `<TaskComments>` only on `TaskDetailsView`, which is instance-only); frontend/Deno mirrors not affected this wave; **zero new npm dependencies**; atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only.
