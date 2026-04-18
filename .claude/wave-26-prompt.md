## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 25 shipped to `main`:
- `c17ce49 feat(wave-25): surface topically related Master Library templates in the Strategy follow-up flow`
- `b770209 feat(wave-25): add task_type discriminator column + BEFORE trigger + backfill`
- `4f48b53 feat(wave-25): ProjectSwitcher reveals completed projects behind a toggle`

Spec is at **1.10.1**. §6 Backlog is **empty** — every Wave 22/23/24 carve-out has shipped, the `task_type` discriminator dev-note is closed, and the §3.5 Library Integration loop (hide-already-present + topically-related) is fully wired.

The big remaining roadmap surfaces sit in §3.3 Collaboration Suite, §3.6 Gantt Chart, §3.7 platform features, §3.8 mobile infra, and §3.1 localization. Wave 26 opens the Collaboration Suite by shipping its **first** column: threaded task comments. Activity log + realtime presence land in Wave 27 on top of this foundation.

**Gate baseline going into Wave 26:** confirm the current `main` baseline before you start. Run `npm run lint` (expect 0 errors, 7 pre-existing warnings — do not regress), `npm run build` (expect clean), `npx vitest run` (record the file/test count — Wave 25 left ≥547 passing across ≥47 files; the actual baseline at the start of Wave 26 is whatever HEAD on `main` is producing). Write the observed numbers into the wave's PR description as the "starting baseline" so the verification gate at the end has a reference to compare against.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-26-comments-schema`
- Task 2 → `claude/wave-26-comments-ui`
- Task 3 → `claude/wave-26-comments-realtime`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main` unless the user explicitly says to.

## Wave 26 scope

Three tightly scoped tasks delivering the threaded-comments half of the §3.3 Collaboration Suite. The activity-log and realtime-presence halves are reserved for Wave 27 — explicitly out of scope here.

---

### Task 1 — Schema + RLS for `task_comments`

**Commit:** `feat(wave-26): task_comments table + threading + RLS`

Lay down the data model with first-class threading and additive RLS that mirrors the per-project access pattern already used by `tasks` and `task_resources`.

1. **Migration** (`docs/db/migrations/2026_XX_XX_task_comments.sql`, NEW)
   - `CREATE TABLE public.task_comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, root_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, parent_comment_id uuid REFERENCES public.task_comments(id) ON DELETE CASCADE, author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT, body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000), mentions uuid[] NOT NULL DEFAULT ARRAY[]::uuid[], created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), edited_at timestamptz, deleted_at timestamptz)`.
   - Indexes: `idx_task_comments_task_id` on `(task_id, created_at DESC)`, `idx_task_comments_root_id` on `(root_id, created_at DESC)`, `idx_task_comments_parent_comment_id` on `(parent_comment_id)` WHERE `parent_comment_id IS NOT NULL`.
   - Trigger `trg_task_comments_set_root_id BEFORE INSERT ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.set_task_comments_root_id()` — function looks up `tasks.root_id` (or falls back to `tasks.id` when `root_id IS NULL`) for `NEW.task_id` and assigns to `NEW.root_id`. Mirrors the `set_root_id_from_parent()` pattern on `tasks`.
   - Trigger `trg_task_comments_handle_updated_at BEFORE UPDATE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()` (reuses the existing function — same as `tasks`).
   - **RLS** — enable, then four policies:
     - SELECT: project members (any role) via `is_active_member(root_id, auth.uid())` OR `is_admin(auth.uid())`. (Comments are visible to everyone who can see the task.)
     - INSERT: project members (any role except where the project would naturally exclude them) — match the SELECT clause; the per-task UPDATE-style permission grids do **not** gate read/write of comments. WITH CHECK additionally requires `author_id = auth.uid()`.
     - UPDATE: `author_id = auth.uid()` AND `deleted_at IS NULL` (own comments only) OR `is_admin(auth.uid())`. WITH CHECK forbids changing `task_id`, `root_id`, `parent_comment_id`, `author_id` (immutable).
     - DELETE: `author_id = auth.uid()` OR project owner via `check_project_ownership_by_role(root_id, auth.uid())` OR `is_admin(auth.uid())`. **Soft-delete preferred:** the UI calls UPDATE `SET deleted_at = now()` instead of DELETE; hard DELETE is reserved for admin/cleanup.
   - **Realtime publication:** `ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;` — required so Wave 26 Task 3 (and Wave 27) can subscribe.
   - Mirror everything (table, indexes, triggers, policies, publication add) into `docs/db/schema.sql` per the SSoT pattern.

2. **Generated types** (`src/shared/db/database.types.ts`)
   - Hand-add the `task_comments` table block (Row/Insert/Update) following the same pattern Wave 23/24/25 used when types lagged the DB. Rows: `id: string, task_id: string, root_id: string, parent_comment_id: string | null, author_id: string, body: string, mentions: string[], created_at: string, updated_at: string, edited_at: string | null, deleted_at: string | null`.

3. **Domain types** (`src/shared/db/app.types.ts`)
   - `export type TaskCommentRow = Database['public']['Tables']['task_comments']['Row'];`
   - `export type TaskCommentInsert = Database['public']['Tables']['task_comments']['Insert'];`
   - `export type TaskCommentUpdate = Database['public']['Tables']['task_comments']['Update'];`
   - Add `TaskCommentWithAuthor = TaskCommentRow & { author: { id: string; email: string; user_metadata?: UserMetadata } | null }` for the join shape the UI needs.

4. **Architecture doc** (`docs/architecture/tasks-subtasks.md`)
   - New `## Comments (Wave 26)` section under the existing wave-tagged sections. Document the table shape, threading model (`parent_comment_id`, no depth cap at the DB layer — UI will enforce a 1-level reply nesting in Task 2), soft-delete semantics, and the RLS rule that "anyone who can see the task can read/comment, but only authors edit; owners + authors + admins delete."

5. **Tests**
   - Manual `psql` smoke at `docs/db/tests/task_comments_rls.sql` (NEW) — exercise each policy under the four personas (owner, editor, viewer, non-member) plus the soft-delete vs. hard-delete branches and `set_task_comments_root_id` correctness on a comment posted directly to a phase row vs. a leaf task.

**DB migration?** Yes — additive (new table + indexes + 2 triggers + 4 policies + publication add). Revertable via the migration header.

**Out of scope:** Mention resolution to actual `auth.users` rows (Task 2 stores raw uuids in `mentions[]`; the `@username → uuid` lookup is deferred — comments still render the typed handle via the optimistic field). Anything related to the activity log or presence (Wave 27).

---

### Task 2 — Comments UI + planterClient methods

**Commit:** `feat(wave-26): TaskComments component + planterClient.entities.TaskComment`

Wire the full read + write UX into the existing task detail surface. No new route — the comments live inside `TaskDetailsView.tsx` directly below the existing "Related Tasks" section.

1. **planterClient methods** (`src/shared/api/planterClient.ts`)
   - New `entities.TaskComment` namespace with:
     - `listByTask(taskId: string): Promise<TaskCommentWithAuthor[]>` — joins via `select('*, author:users(id, email, user_metadata)')` (or whatever the existing user-join shape is in `planterClient`). Filters `deleted_at IS NULL` by default; second-arg `{ includeDeleted: boolean }` opens up the soft-deleted rows for the audit log in Wave 27 — wire the parameter now even though Wave 26 callers always pass `false`.
     - `create({ task_id, parent_comment_id, body, mentions }): Promise<TaskCommentWithAuthor>` — `author_id` is filled from `auth.uid()` on the server (it's the WITH CHECK contract). Returns the inserted row joined with author.
     - `updateBody(commentId, { body, mentions }): Promise<TaskCommentRow>` — server `UPDATE` sets `edited_at = now()` via the trigger; the trigger also bumps `updated_at`. Returns the updated row.
     - `softDelete(commentId): Promise<TaskCommentRow>` — `UPDATE … SET deleted_at = now(), body = ''` (clear body to avoid leaking content through cached query results post-delete).
   - All four methods pass through React Query keys named `['taskComments', taskId]`.

2. **Hook** (`src/features/tasks/hooks/useTaskComments.ts`, NEW)
   - `useTaskComments(taskId: string | null)` — `useQuery({ queryKey: ['taskComments', taskId], enabled: !!taskId })`.
   - `useCreateComment(taskId: string)` — `useMutation` with optimistic insert into the cache (newComment with a temp uuid). On error: rollback + toast. On success: invalidate `['taskComments', taskId]`.
   - `useUpdateComment(taskId: string)` — same optimistic pattern; on error rollback + toast.
   - `useDeleteComment(taskId: string)` — soft-delete; optimistic removal from the displayed list; rollback on error.

3. **Mention parser** (`src/features/tasks/lib/comment-mentions.ts`, NEW)
   - Pure function `extractMentions(body: string): string[]` returning the unique handles after `@` (anything matching `/@([a-zA-Z0-9_.\-]+)/g`). Stored in `mentions[]` as **strings** for Wave 26; the future resolver to `auth.users.id` lands in Wave 30 alongside the notification stack. Document this in a JSDoc comment on the function so the next wave doesn't have to re-discover the contract.

4. **UI components** (`src/features/tasks/components/TaskComments/`, NEW directory — tasks domain)
   - `TaskComments.tsx` — top-level composition mounted by `TaskDetailsView.tsx`. Props: `{ taskId: string }`. Renders compose form + threaded list. Uses `useTaskComments`, `useCreateComment`, `useUpdateComment`, `useDeleteComment`.
   - `CommentList.tsx` — consumes `TaskCommentWithAuthor[]`, groups top-level comments (`parent_comment_id IS NULL`) and renders each with its replies underneath. **UI-side depth cap = 1**: replies to a reply collapse to the same level (the `parent_comment_id` chain on the DB can go deeper, but the UI only ever renders one nesting level — replies-to-replies threadlift to the same indent as the original reply, with a `↪ in reply to @author` chip).
   - `CommentItem.tsx` — single comment with author avatar (initials fallback), body, edit/delete affordances (only shown when `author_id === currentUser.id`), reply button.
   - `CommentComposer.tsx` — `<Textarea>` + Send button + `Esc` to cancel. `react-hook-form` + zod (`body: z.string().trim().min(1).max(10000)`). On submit: parses mentions via `extractMentions`, calls `useCreateComment.mutate({ task_id, parent_comment_id, body, mentions })`. Disabled when `body` is empty; submitting shows a Sonner toast.
   - All four components use only existing Shadcn primitives (`Button`, `Textarea`, `Avatar` if it exists, otherwise build a small `<div>` with initials). No arbitrary Tailwind values; no pure black; reuse the existing `slate-200` borders and `rounded-xl` card pattern from `TaskDetailsView`.

5. **Integration** (`src/features/tasks/components/TaskDetailsView.tsx`)
   - Mount `<TaskComments taskId={task.id} />` directly below the existing "Related Tasks" section. Comment count appears as a chip in the section header (`{count} comments`).
   - Empty state: "No comments yet — be the first to add one."

6. **Tests**
   - `Testing/unit/shared/api/planterClient.taskComments.test.ts` (NEW) — query shape for list/create/update/softDelete; soft-delete sets both `deleted_at` and `body = ''`; `includeDeleted` flag toggles the filter.
   - `Testing/unit/features/tasks/lib/comment-mentions.test.ts` (NEW) — `extractMentions` covers empty body, no mentions, single mention, multiple mentions, dupes deduplicated, punctuation trimmed (`@joe.` → `joe`), repeated `@` adjacency.
   - `Testing/unit/features/tasks/hooks/useTaskComments.test.tsx` (NEW) — optimistic insert, rollback on error, cache key invalidation.
   - `Testing/unit/features/tasks/components/TaskComments/TaskComments.test.tsx` (NEW) — renders empty state; renders threaded list with replies grouped under parents; reply-to-reply renders at depth-1 with the in-reply-to chip; edit/delete affordances visible only for own comments; soft-deleted rows are hidden from the default render.

**DB migration?** No — Task 1 owns the schema. Task 2 is purely app code.

**Out of scope:** Markdown rendering in comment bodies (plain text + line breaks only — wave-aware MD support is a Wave 31 nice-to-have when localization lands a richer text-render layer); rich text editor; file attachments on comments; reactions/emoji; mention resolution to actual users (handles are stored raw — see Task 2 step 3).

---

### Task 3 — Realtime invalidation for comments

**Commit:** `feat(wave-26): subscribe to task_comments realtime channel for live updates`

The `task_comments` table is now in the realtime publication. Wire a channel subscription that invalidates the React Query cache when a remote insert/update/delete arrives, so two users editing the same task see each other's comments without a manual refresh.

1. **Subscription hook** (`src/features/tasks/hooks/useTaskCommentsRealtime.ts`, NEW)
   - `useTaskCommentsRealtime(taskId: string | null)` — opens a Supabase realtime channel scoped to the row filter `task_id=eq.<taskId>`.
   - On any `INSERT | UPDATE | DELETE`, dispatch `queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] })`. Don't try to merge the payload manually — invalidation is cheap, and the WITH CHECK shape makes manual merging risky (the realtime payload doesn't include the joined author).
   - Cleanup on unmount: `supabase.removeChannel(channel)`.
   - **No-op when `taskId` is null** so the hook can be called unconditionally inside `TaskComments.tsx`.

2. **Wire into `TaskComments.tsx`** — call `useTaskCommentsRealtime(taskId)` at the top of the component (sibling of the data hook).

3. **`Project.tsx` realtime audit** — `pages/Project.tsx` already opens the project-scoped task realtime channel. Do **not** add comments-on-`tasks` filtering there; the comments channel lives at the per-task level so it's not noisy when the panel is closed. Document this split in a one-line comment in `pages/Project.tsx` near the existing channel setup so the next reader doesn't try to merge them.

4. **AGENT_CONTEXT.md** — add a new "Comments (Wave 26)" golden-path bullet describing the data flow: `TaskDetailsView → TaskComments → useTaskComments + useTaskCommentsRealtime → planterClient.entities.TaskComment → Supabase`.

5. **Tests**
   - `Testing/unit/features/tasks/hooks/useTaskCommentsRealtime.test.ts` (NEW) — mocks `supabase.channel(...)`, asserts that `INSERT` / `UPDATE` / `DELETE` payloads each fire one `invalidateQueries` call with the right key. Asserts cleanup removes the channel on unmount. Asserts `taskId === null` results in no channel subscription at all.

**DB migration?** No — the publication add is part of Task 1's migration.

**Out of scope:** Optimistic UI for *remote* writes (we just invalidate); presence cursors (Wave 27); typing indicators (deferred — needs presence first).

---

## Documentation Currency Pass (mandatory — before review)

Every wave from here forward includes an explicit doc-update step **inside** the wave so the docs never lag the code. Run this pass as a final commit on each task's branch (or as one consolidated commit on a `claude/wave-26-docs` branch after all three tasks merge — operator's choice, default to per-task for tighter PR reviews):

1. **`spec.md`** — flip §3.3 Collaboration Suite from `[ ]` to `[/]` (in progress) and append a sub-bullet `[x] Threaded comments (Wave 26)` so the Wave 27 work has a clear scope-line. Bump version to **1.11.0** (a meaningful new collaboration surface). Update `Last Updated` to today's date.
2. **`docs/AGENT_CONTEXT.md`** — confirm Task 3's "Comments (Wave 26)" golden path is in. Add a note in the §3a "Key Behavioral Contracts" section about the comments soft-delete invariant if it shapes future ancestor logic.
3. **`docs/architecture/tasks-subtasks.md`** — Task 1's `## Comments (Wave 26)` section is in. Cross-link to `docs/architecture/auth-rbac.md` if the SELECT/INSERT/UPDATE/DELETE matrix should also live there. Default: keep policy text in `tasks-subtasks.md` since it's the primary owning doc; add only a one-line pointer in `auth-rbac.md` under "Resolved" or a new "Wave 26 RLS additions" sub-section.
4. **`docs/architecture/auth-rbac.md`** — one-line sub-section under "Resolved" or "Business Rules": "Comments inherit project SELECT scope; authors hold UPDATE; owners + authors + admins hold DELETE. See `tasks-subtasks.md` for the full policy text."
5. **`docs/dev-notes.md`** — no entry needed (no new tech-debt). If the deferred items list in this file's earlier sections is stale, prune.
6. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 26 (Comments)`, update `last_completed`, `spec_version`, and add a `wave_26_highlights:` block listing the migration filename, the new `entities.TaskComment` namespace, and the realtime hook.
7. **`CLAUDE.md`** — under "Schema Overview", add `task_comments` to the Tables list with a one-line summary. Under "RLS Policy Pattern", note the comments-specific divergence (any-member can INSERT — no editor-gate).

Each doc edit lands as a single `docs(wave-26): documentation currency sweep` commit at the close of the wave (or per task if you prefer; either is OK, but **the docs-sweep commit MUST land before the wave is marked complete**).

## Wave Review (mandatory — before commit + push to main)

Treat this as a self-PR-review pass. Open the wave's commits in `git log -p` and walk:

1. **Schema review** — does the migration header carry: a one-paragraph description, the revert path, and the cross-reference to the SSoT (`docs/db/schema.sql`)? Did you mirror every object into `schema.sql` verbatim?
2. **RLS coverage** — for each new policy, can you name the four personas it gates (owner, editor, viewer/limited, non-member) and explain what each can/can't do? If you can't, write that audit table into the architecture doc before merging.
3. **App-layer correctness** — does every `useMutation` have a rollback in `onError` and a `queryClient.invalidateQueries` in `onSettled` (or `onSuccess` if you don't need to refetch on error)? The optimistic-rollback rule from `.gemini/styleguide.md` §5 is non-negotiable.
4. **Realtime** — does `useTaskCommentsRealtime` clean up its channel on unmount? Run it twice in dev (open task → close → open again) and confirm no zombie channels. Use `Supabase Studio → Realtime` if available locally.
5. **No FSD drift** — `shared/` does not import from `features/`; no new barrel files; `@/` aliases only.
6. **Type drift** — `database.types.ts` was hand-edited in Task 1; if you ever ran `npm run generate:types` in the session, **stop**, revert that file, and re-apply the hand edit (the generator overwrites our additions). Document this in the PR.
7. **Test coverage** — every new file in `src/` has a matching `Testing/unit/...` mirror. Snapshot the test count delta in the PR description.
8. **Lint + build + tests** — all four pass with zero regression vs. the starting baseline you recorded at the top of the wave.

If any item above is "no", **fix it before pushing**. The review is the wave; the merge is just paperwork.

## Commit & Push to Main (mandatory — gates Wave 27)

After the Documentation Currency Pass and Wave Review both pass:

1. Confirm each task's PR has been merged (squash or rebase per the user's preference — default to squash so each task lands as one commit on `main`).
2. Run the verification gate one last time on a fresh `main` checkout: `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
3. The commit history on `main` after the wave should show, in order: 3 task commits (Task 1, 2, 3) + 1 docs sweep commit. `git log --oneline main..origin/main` should return empty (i.e., nothing pending push).
4. Push to `origin/main` (https://github.com/JoelA510/PlanterPlan-Alpha/). If the user has a CI pipeline gate, wait for it to go green before declaring the wave complete.
5. **Do not start Wave 27** until all of the above is true. The next wave's "Session Context" recap pulls from `main`.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline 7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # ≥547 + new tests added this wave
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- **Task 1:** `psql -c "\d public.task_comments"` shows the table + indexes; `\dp public.task_comments` shows the four policies; `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_comments'` returns one row.
- **Task 2:** open any task detail → "Comments" section renders with the empty state. Post a top-level comment → appears immediately. Reply → appears nested under the parent. Reply-to-reply → appears at depth-1 with the in-reply-to chip. Edit own comment → `edited_at` populates and the UI shows an "(edited)" suffix. Delete → comment disappears from the default render. Open the same task as a non-member → 0 comments + no compose form.
- **Task 3:** open the task in two browser windows (different users on the same project). Post a comment in window A → window B's list refreshes within a couple seconds without a manual reload. Edit + delete behave the same way.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT (read before touching business logic)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `docs/db/schema.sql` — SSoT for DB objects; mirror every migration here
- `docs/db/migrations/2026_04_17_coaching_task_rls.sql` — RLS additive-policy precedent
- `docs/db/migrations/2026_04_18_task_type_discriminator.sql` — column + index + trigger + backfill precedent
- `src/features/tasks/hooks/useTaskSiblings.ts` — Wave 21.5 task-scoped hook precedent (good shape to mirror for `useTaskComments`)
- `src/features/tasks/components/TaskDetailsView.tsx` — Task 2 mounts the new component here
- `src/shared/api/planterClient.ts` — `entities.Task.listSiblings` (Wave 21.5) is the closest precedent for the `entities.TaskComment` namespace shape
- `pages/Project.tsx` — existing realtime channel setup; Task 3 documents the split between project-level vs. comment-level subscriptions

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror Task 1 migration)
- `docs/architecture/tasks-subtasks.md` (Comments section)
- `docs/architecture/auth-rbac.md` (one-line cross-reference)
- `docs/AGENT_CONTEXT.md` (Wave 26 golden-path additions)
- `docs/dev-notes.md` (no entry expected; verify currency)
- `src/shared/db/database.types.ts` (hand-add `task_comments` block)
- `src/shared/db/app.types.ts` (`TaskCommentRow/Insert/Update`, `TaskCommentWithAuthor`)
- `src/shared/api/planterClient.ts` (`entities.TaskComment`)
- `src/features/tasks/components/TaskDetailsView.tsx` (mount `<TaskComments />`)
- `pages/Project.tsx` (one-line comment about channel split)
- `spec.md` (flip §3.3 to `[/]` + sub-bullet, bump to 1.11.0)
- `repo-context.yaml` (Wave 26 highlights block)
- `CLAUDE.md` (`task_comments` schema row + RLS pattern divergence note)

**Will create:**
- `docs/db/migrations/2026_XX_XX_task_comments.sql`
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
- Markdown rendering, file attachments, emoji reactions
- Comment-level RLS that mirrors the Coaching task per-flag pattern (no equivalent need; SELECT scope is project-membership, edit scope is authorship)
- Backfill of any historical "comment" data — none exists pre-Wave-26

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (use `date-engine` — comments use `created_at`/`updated_at`/`edited_at` strings; format via `formatDisplayDate`); no direct `supabase.from()` in components (go through `planterClient`); Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1 (does not apply to comments — comment threading goes deeper at the DB but the UI caps at 1); template vs instance clarified on any cross-cutting work (`origin = 'template' | 'instance'` — comments only attach to instance tasks in practice, but the schema doesn't restrict; document this UX convention in the architecture doc); frontend/Deno recurrence + date helpers stay in lock-step; only add dependencies if truly necessary (motivate in the PR — Wave 26 should add **zero** new npm deps); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only unless the user explicitly approves a breaking change in-session.
