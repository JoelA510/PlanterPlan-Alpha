# Wave 21.5 — Session Plan (Tasks 3 & 4)

## Context

Wave 21 shipped Supervisor Reports (log-only) and Recurring Tasks on branch
`claude/plan-next-session-JMlTx`. Baseline after that wave: **441/441 tests
passing, 0 lint errors, clean build**. The PR to `main` is open.

Wave 21.5 finishes the originally-scoped Wave 21 backlog by picking up the two
items deferred for scope control. Both are **zero-schema-change** features —
filter-plus-UI on the frontend only.

**Prompt-vs-reality mismatch (carry-over from Wave 21):** the original
`.claude/wave-21-prompt.md` names `EditTaskModal.tsx`, which does not exist.
The task-edit surface in this codebase is `TaskDetailsView.tsx` (detail pane);
related-tasks + Email action belong there.

## Branch

Spin a new branch off `main` once the Wave 21 PR lands:
`claude/wave-21-5-archive-and-details`.

---

## Task 3 — §3.2 Secondary Projects & Archive Filtering

**Commit:** `feat(wave-21-5): hide archived projects from active menu + project switcher`

### Scope (no schema change — filter on existing `tasks.status`)

1. **Status taxonomy** (`src/shared/constants/domain.ts`)
   - Extend `PROJECT_STATUS` with `ARCHIVED: 'archived'` alongside the existing
     `planning | in_progress | launched | paused`.
   - Decide on the "completed project" signal — reuse `status = 'completed'`
     on the root task if present, otherwise rely on the existing `is_complete`
     flag on the root. Document the decision in
     `docs/architecture/projects-phases.md`.

2. **Filter at the data boundary** (`src/features/dashboard/hooks/useDashboard.ts`)
   - Today the hook lists every `planter.entities.Project.list()` result.
     Split into `activeProjects` vs `archivedProjects` client-side by
     `status !== 'archived' && !is_complete`. Expose both; default UI renders
     `activeProjects` only.
   - Add the same filter to `ProjectSidebar.tsx` (the sidebar picker).

3. **Project switcher UI** (`src/shared/components/ProjectSwitcher.tsx`, NEW)
   - Shadcn `DropdownMenu` in the top bar listing active projects. Selecting
     one navigates to `/project/:id`.
   - A "Show archived" toggle at the bottom of the menu expands the archived
     list inline (don't open a second route for this).
   - Wire into `DashboardLayout.tsx` header; leaves room for
     `PROJECT_STATUS.ARCHIVED` badges later without a rewrite.

4. **Archive / unarchive action** (`src/features/projects/components/EditProjectModal.tsx`)
   - Add a destructive-secondary button "Archive project" (and "Unarchive"
     when already archived). Calls `useUpdateProject` with
     `{ status: 'archived' }`. Toast confirmation.
   - No cascade — archiving a root never touches descendants (archive is a
     top-level filter concept, not a state propagation).

5. **Tests** (`Testing/unit/features/dashboard/useDashboard.test.ts` +
   `Testing/unit/shared/components/ProjectSwitcher.test.tsx`)
   - `useDashboard` splits projects correctly (archived/non-archived).
   - Switcher renders only active projects by default; toggle reveals
     archived.
   - EditProjectModal archive button fires the expected mutation payload.

### Explicitly out of scope

- No schema change. No `project_members.role` change.
- No cascading "auto-archive completed projects" — user action only.
- No URL route for the archived view; lives inside the switcher.

---

## Task 4 — §3.3 Task Detail Enhancements

**Commit:** `feat(wave-21-5): related tasks + email-details action on task detail pane`

### Scope (no schema change — reuse `user_metadata`)

1. **Related tasks list** (`src/features/tasks/components/TaskDetailsView.tsx`)
   - New "Related Tasks" section beneath the existing task body.
   - Source: siblings under the same `parent_task_id` (excluding the current
     task). Respects the existing `position` ordering.
   - New `planterClient` method `Task.listSiblings(taskId)` in
     `src/shared/api/planterClient.ts`: single query,
     `.eq('parent_task_id', <parent>).neq('id', taskId).order('position')`.
     Returns `TaskRow[]`. Wrap in a `useQuery(['taskSiblings', taskId])`
     hook in `src/features/tasks/hooks/useTaskSiblings.ts`.
   - Empty state: "No sibling tasks in this milestone."

2. **Email-details action** (`TaskDetailsView.tsx`)
   - Secondary button "Email details" that opens a Shadcn `Dialog` with:
     - Recipient `<Input type="email">` (react-hook-form + zod validation).
     - Readonly textarea showing the generated email body (title + purpose
       + actions + dates + link back to the task).
     - "Send" button.
   - Dispatch: Supabase Edge Function `supabase/functions/email-task-details/`
     (NEW) that accepts `{ to, subject, body, taskId }`. Wave 21.5 keeps it
     **log-only**, same pattern as `supervisor-report` — gated behind
     `EMAIL_PROVIDER_API_KEY`, `TODO(wave-22)` marker for real dispatch. Keep
     the response shape compatible with the future SMTP wiring.
   - Or (lighter alternative): use a `mailto:` link with the prefilled body.
     If we go this route, drop the edge function entirely and file a backlog
     item for the server-side version. **Decision point to confirm with the
     user before coding.**

3. **Saved-address memory** (`src/shared/contexts/AuthContext.tsx`)
   - Persist used recipient addresses to
     `user_metadata.saved_email_addresses: string[]` via
     `planter.auth.updateProfile`. Cap at the 5 most-recent (de-duplicated,
     most-recent-first).
   - Expose `savedEmailAddresses: string[]` on the AuthContext value and
     feed into a `<datalist>` or Shadcn `Command` typeahead in the dialog.
   - Unit-test the cap/dedup logic in
     `Testing/unit/shared/contexts/AuthContext.savedEmailAddresses.test.tsx`.

4. **Tests**
   - `Testing/unit/features/tasks/components/TaskDetailsView.related.test.tsx`
     — related-tasks list renders siblings; hides the current task; shows
     empty state when alone.
   - `Testing/unit/features/tasks/components/TaskDetailsView.email.test.tsx`
     — dialog validates email; firing Send calls the mutation with the
     expected payload.
   - `Testing/unit/shared/api/planterClient.listSiblings.test.ts` — query
     shape matches contract.

### Explicitly out of scope

- No full "activity/audit log" — Collaboration Suite lives in a later wave.
- No push notification layer — email is the only dispatch channel.
- No `people` table integration — addresses live on the authenticated user.

---

## Verification Gate (end of wave)

All must pass before the final push:

```bash
npm run lint      # 0 errors
npm run build     # clean (tsc -b && vite build)
npm test          # ≥441 passing + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- Archive a project → disappears from switcher / sidebar / dashboard cards
  unless "Show archived" is toggled.
- Unarchive → reappears immediately after React Query invalidation.
- Open any task detail → related tasks render in position order; current
  task is excluded.
- Fire "Email details" → dialog validates, autocompletes from saved
  addresses, submits cleanly; payload printed in function logs when
  `EMAIL_PROVIDER_API_KEY` is unset (or `mailto:` if we go that route).
- Re-open the dialog → recipient address is pre-filled from the last use.

## Critical Files

**Will edit:**
- `src/shared/constants/domain.ts` (add `ARCHIVED` status)
- `src/features/dashboard/hooks/useDashboard.ts`
- `src/features/navigation/components/ProjectSidebar.tsx`
- `src/features/projects/components/EditProjectModal.tsx` (archive button)
- `src/features/tasks/components/TaskDetailsView.tsx` (related-tasks + email)
- `src/shared/api/planterClient.ts` (`Task.listSiblings`)
- `src/shared/contexts/AuthContext.tsx` (`savedEmailAddresses` memory)
- `src/layouts/DashboardLayout.tsx` (header slot for switcher)
- `spec.md` (flip `[ ]` → `[x]` on both items; bump to 1.8.0)
- `docs/AGENT_CONTEXT.md` (switcher + task-details notes)
- `docs/architecture/projects-phases.md` (archive semantics)

**Will create:**
- `src/shared/components/ProjectSwitcher.tsx`
- `src/features/tasks/hooks/useTaskSiblings.ts`
- `supabase/functions/email-task-details/{index.ts,README.md}` (iff we keep
  the server-side dispatch path rather than `mailto:` — pending decision)
- Unit tests under `Testing/unit/...` mirroring the source tree

**Explicitly out of scope this wave:**
- `supabase/functions/supervisor-report/` real dispatch wiring (tracked as
  Wave 22 backlog in `spec.md` §6).
- Collaboration Suite (comments / audit log / realtime presence).
- Gantt chart.
- Specialized Task Types (Strategy / Coaching).
- PWA / offline mode.

## Ground Rules (unchanged — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no barrel files; no raw date math; no direct
`supabase.from()` in components; Tailwind utility classes only (no arbitrary
values); optimistic rollback with force-refetch on error; 5-attempt debugging
cap; atomic revertable commits; build + lint + tests clean before every push.

## Key Open Decision

**Email-details action — server send vs. `mailto:` link?** Confirm before
starting Task 4. Server dispatch parallels the supervisor-report pattern and
keeps future notification features unified; `mailto:` ships in half the code
and has zero backend surface area. Default recommendation: start with
`mailto:`, add an edge-function path as a follow-up only if the saved-address
memory alone proves insufficient.
