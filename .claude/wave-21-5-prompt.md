## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 21 shipped on PR #143 and is now merged to `main`:
- §3.6 **Supervisor Reports** — `supervisor_email` on project roots + `supabase/functions/supervisor-report/` edge function (**log-only**; dispatch gated behind `EMAIL_PROVIDER_API_KEY`, tracked in `spec.md` §6 for Wave 22).
- §3.3 **Recurring Tasks** — `settings.recurrence` JSONB rule on templates, evaluator at `src/shared/lib/recurrence.ts` (frontend) + `supabase/functions/_shared/recurrence.ts` (Deno mirror, **lock-step**). Spawned by a third pass in `supabase/functions/nightly-sync/`. UI: `src/features/tasks/components/RecurrencePicker.tsx` (rendered inside `TaskForm` only for `origin === 'template'`).
- **Review follow-up (commit `57081b6`)** hardened the recurrence idempotency key, merged template settings into the clone stamp, extracted Deno date helpers to `supabase/functions/_shared/date.ts`, and sanitized edge-function error responses.

**Test baseline going into Wave 21.5: 452/452 passing across 33 suites, 0 lint errors, clean build.** Do not regress.

## Branch

Spin off `main` once the merge is confirmed: `claude/wave-21-5-archive-and-details`. All work lives there; no PR unless the user requests one at the end of the session.

## Wave 21.5 scope (zero-schema-change)

Both remaining items from the originally-scoped Wave 21 backlog. Frontend-only filter + UI — no new columns, no RPC changes, no edge functions (unless we go the server-dispatch route on Task 4 — see the open decision at the bottom).

**Prompt-vs-reality carry-over from Wave 21:** the original Wave 21 prompt names `EditTaskModal.tsx`, which does not exist in this codebase. The task-edit surfaces are `TaskForm.tsx` (inline edit / create) and `TaskDetailsView.tsx` (detail pane). Related-tasks and the Email action below belong in `TaskDetailsView.tsx`.

---

### Task 1 — §3.2 Secondary Projects & Archive Filtering

**Commit:** `feat(wave-21-5): hide archived projects from active menu + project switcher`

1. **Status taxonomy** (`src/shared/constants/domain.ts`)
   - Extend `PROJECT_STATUS` with `ARCHIVED: 'archived'` alongside the existing `planning | in_progress | launched | paused`.
   - Document the "completed project" signal in `docs/architecture/projects-phases.md` — reuse `status === 'completed'` on the root task if present, otherwise the existing `is_complete` flag.

2. **Filter at the data boundary** (`src/features/dashboard/hooks/useDashboard.ts`)
   - Today the hook renders every `planter.entities.Project.list()` result. Split into `activeProjects` vs `archivedProjects` client-side by `status !== 'archived' && !is_complete`. Expose both; default UI renders `activeProjects` only. Apply the same filter to `ProjectSidebar.tsx`.

3. **Project switcher UI** (`src/shared/components/ProjectSwitcher.tsx`, NEW)
   - Shadcn `DropdownMenu` in the top bar listing active projects. Selecting one navigates to `/project/:id`.
   - "Show archived" toggle at the bottom of the menu expands the archived list inline (no second route).
   - Wire into `DashboardLayout.tsx` header; leaves room for `PROJECT_STATUS.ARCHIVED` badges later without a rewrite.

4. **Archive / unarchive action** (`src/features/projects/components/EditProjectModal.tsx`)
   - Destructive-secondary button "Archive project" (and "Unarchive" when already archived). Calls `useUpdateProject` with `{ status: 'archived' }`. Toast confirmation. No cascade — archiving a root never touches descendants.

5. **Tests** (`Testing/unit/features/dashboard/useDashboard.test.ts` + `Testing/unit/shared/components/ProjectSwitcher.test.tsx`)
   - `useDashboard` splits projects correctly (archived / non-archived).
   - Switcher renders only active by default; toggle reveals archived.
   - `EditProjectModal` archive button fires the expected mutation payload.

**Out of scope:** No schema change. No `project_members.role` change. No cascading auto-archive. No URL route for the archived view — lives inside the switcher.

---

### Task 2 — §3.3 Task Detail Enhancements

**Commit:** `feat(wave-21-5): related tasks + email-details action on task detail pane`

1. **Related tasks list** (`src/features/tasks/components/TaskDetailsView.tsx`)
   - New "Related Tasks" section below the task body.
   - Source: siblings under the same `parent_task_id` (excluding the current task), ordered by `position`.
   - New `planterClient` method `Task.listSiblings(taskId)` in `src/shared/api/planterClient.ts`: `.eq('parent_task_id', <parent>).neq('id', taskId).order('position')`. Returns `TaskRow[]`.
   - Wrap in `useQuery(['taskSiblings', taskId])` hook at `src/features/tasks/hooks/useTaskSiblings.ts`.
   - Empty state: "No sibling tasks in this milestone."

2. **Email-details action** (`TaskDetailsView.tsx`)
   - Secondary button "Email details" opens a Shadcn `Dialog`:
     - Recipient `<Input type="email">` (react-hook-form + zod).
     - Readonly textarea showing the generated body (title + purpose + actions + dates + link back to the task).
     - "Send" button.
   - **Open decision — confirm with the user before coding this subtask:**
     - **A)** New Supabase Edge Function `supabase/functions/email-task-details/` — mirrors the `supervisor-report` log-only pattern, gated behind `EMAIL_PROVIDER_API_KEY`, `TODO(wave-22)` marker for real dispatch.
     - **B)** `mailto:` link with the prefilled body — no backend surface area, ships in half the code. Default recommendation.

3. **Saved-address memory** (`src/shared/contexts/AuthContext.tsx`)
   - Persist used recipients to `user_metadata.saved_email_addresses: string[]` via `planter.auth.updateProfile`. Cap at 5 most-recent, de-duplicated, most-recent-first.
   - Expose `savedEmailAddresses: string[]` on the `AuthContext` value; feed into a `<datalist>` or Shadcn `Command` typeahead in the dialog.
   - Unit-test the cap / dedup logic in `Testing/unit/shared/contexts/AuthContext.savedEmailAddresses.test.tsx`.

4. **Tests**
   - `Testing/unit/features/tasks/components/TaskDetailsView.related.test.tsx` — siblings render in position order; current task excluded; empty-state copy.
   - `Testing/unit/features/tasks/components/TaskDetailsView.email.test.tsx` — dialog validates email; Send fires the mutation with the expected payload (or opens `mailto:` with the expected href if we go that route).
   - `Testing/unit/shared/api/planterClient.listSiblings.test.ts` — query shape matches the contract.

**Out of scope:** No full activity/audit log (Collaboration Suite is a later wave). No push-notification layer. No `people` table integration — saved addresses live on the authenticated user's `user_metadata`.

---

## Verification Gate (end of wave)

All four must pass before the final push:

```bash
npm run lint      # 0 errors
npm run build     # clean (tsc -b && vite build)
npm test          # ≥452 passing + new tests
git status        # clean
```

Manual smoke checks (dev server + local Supabase):
- Archive a project → disappears from switcher / sidebar / dashboard cards unless "Show archived" is toggled.
- Unarchive → reappears immediately after React Query invalidation.
- Open any task detail → related tasks render in position order; current task is excluded.
- Fire "Email details" → dialog validates, autocompletes from saved addresses, submits cleanly. If option A: payload printed to function logs when `EMAIL_PROVIDER_API_KEY` is unset. If option B: `mailto:` href correctly pre-fills recipient + body.
- Re-open the dialog → recipient address is pre-filled from the last use.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT (read before touching business logic)
- `docs/AGENT_CONTEXT.md` — codebase map with golden paths
- `src/shared/db/app.types.ts` — domain types (re-exported from generated Supabase types)
- `src/shared/api/planterClient.ts` — all DB access (never call `supabase.from()` in components)
- `src/shared/lib/date-engine/index.ts` — use for **all** date math
- `src/features/projects/hooks/useProjectReports.ts` — payload shape precedent if option A lands
- `supabase/functions/_shared/{date,recurrence}.ts` — Deno-side shared helpers, mirror of frontend (**lock-step**)

## Critical Files

**Will edit:**
- `src/shared/constants/domain.ts` (add `ARCHIVED`)
- `src/features/dashboard/hooks/useDashboard.ts`
- `src/features/navigation/components/ProjectSidebar.tsx`
- `src/features/projects/components/EditProjectModal.tsx` (archive button)
- `src/features/tasks/components/TaskDetailsView.tsx` (related-tasks + email)
- `src/shared/api/planterClient.ts` (`Task.listSiblings`)
- `src/shared/contexts/AuthContext.tsx` (`savedEmailAddresses`)
- `src/layouts/DashboardLayout.tsx` (switcher slot)
- `spec.md` (flip both items `[ ] → [x]`; bump to 1.8.0)
- `docs/AGENT_CONTEXT.md` (switcher + task-details notes)
- `docs/architecture/projects-phases.md` (archive semantics)

**Will create:**
- `src/shared/components/ProjectSwitcher.tsx`
- `src/features/tasks/hooks/useTaskSiblings.ts`
- `supabase/functions/email-task-details/{index.ts,README.md}` **only if option A wins**
- Unit tests under `Testing/unit/...` mirroring source paths

**Explicitly out of scope this wave:**
- `supabase/functions/supervisor-report/` real dispatch wiring (Wave 22 backlog — `spec.md` §6)
- Collaboration Suite (comments / audit log / realtime presence)
- Gantt chart
- Specialized Task Types (Strategy / Coaching)
- PWA / offline mode

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly); no raw date math (use `date-engine`); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; 5-attempt debugging cap (if stuck, report findings and stop); atomic revertable commits; build + lint + tests all clean before every push.

## Key Open Decision — confirm before Task 2 subtask 2

Email-details action — **option A (server edge function)** or **option B (`mailto:`)**?

Default recommendation: ship **B** first. It's half the code and has zero backend surface area. The saved-address memory (subtask 3) gives us useful user telemetry before committing to an SMTP/Resend integration, and we can always add option A as a follow-up if in-app composition proves necessary. Option A parallels the `supervisor-report` log-only pattern and keeps future notification features unified — worth it only if we already know we'll need server-side composition (audit trail, attachments, branded templates).
