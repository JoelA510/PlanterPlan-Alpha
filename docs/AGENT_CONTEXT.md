# Agent Context & Codebase Map

> **For AI Agents**: Read this first to understand the system architecture,
> patterns, and where to find things. **TECH STACK ALERT**: JavaScript and JSX
> are entirely deprecated. TypeScript (.ts) and TSX (.tsx) are strictly enforced
> across the codebase.

## 1. Directory Structure (Feature-Sliced Variation)

- **`src/features/`**: Domain-specific logic (Business Logic).
  - Structure: `components/`, `hooks/`, `lib/`. *(Note: No barrel files like `index.ts` are used; import directly from the path).*
  - Key Domains: `projects`, `tasks`, `people`, `dashboard`, `library`.
- **`src/pages/`**: Top-level Route Views (Page Composition).
  - _Note_: Pages should primarily compose features, not contain deep logic.
- **`src/shared/`**: Universal utilities and UI (No Business Logic).
  - `ui/`: ShadCN/Radix primitives (Buttons, Inputs, Dialogs).
  - `lib/`: Pure functions (`date-engine`, `tree-helpers`).
  - `api/`: API adapters (`planterClient`).
- **`docs/`**: Source of Truth.
  - `docs/architecture/*.md`: The definitive, modular Single Source of Truth for all domain business rules (Date Engine, RBAC, Tasks). **Always check here first before attempting architectural refactors.**
  - `docs/db/schema.sql`: Current Database Schema.

## 2. Key Patterns

### Data Fetching

- **Primary**: `useQuery` and `useMutation` (TanStack React Query v5) via `planterClient`.
- **Adapter**: `src/shared/api/planterClient.ts` wraps Supabase SDK.
- **Rules**:
  - Do NOT use `supabase.from()` directly in UI components. Use `planterClient`
    or custom mutation hooks (e.g., `useTaskMutations`).
  - Always handle `loading` and `error` states.

### State Management

- **Server State**: React Query (Single Source of Truth).
- **Local State**: `useState` / `useReducer` for form/UI state.
- **Global UI State**: Context (`AuthContext`, Sonner Toasts).

### Styling

- **Engine**: TailwindCSS v4.
- **Components**: Radix UI primitives wrapped in `src/shared/ui/`.
- **Icons**: `lucide-react`.
- **Rules**: Avoid custom CSS files. Use utility classes and
  `class-variance-authority`.

## 3. Golden Paths (Critical Files)

- **Auth**: `src/pages/components/LoginForm.tsx` & `src/shared/contexts/AuthContext.tsx`
- **Dashboard Pipeline**: `src/pages/Dashboard.tsx` ->
  `src/features/dashboard/components/ProjectPipelineBoard.tsx`
- **Project Detail**: `src/pages/Project.tsx` -> `src/features/tasks/components/TaskList.tsx`
- **Task Details**: `src/features/tasks/components/TaskDetailsPanel.tsx`
- **Kanban Board V2 (Wave 20)**: `src/features/tasks/components/board/ProjectBoardView.tsx` → `BoardColumn.tsx` / `BoardTaskCard.tsx`. Native column-to-column drag-and-drop; `deriveUrgency` helper lives in `src/shared/lib/date-engine/index.ts`.
- **Task List Views & Filters (Wave 20)**: `/tasks` → `src/pages/TasksPage.tsx` → `src/features/tasks/hooks/useTaskFilters.ts`. Filtered views: Priority, Overdue, Due Soon, Current, Not Yet Due, Completed, All, Milestones, My Tasks. Chronological/alphabetical sort.
- **Project Status Report (Wave 20)**: `/reports` → `src/pages/Reports.tsx` → `src/features/projects/hooks/useProjectReports.ts`. Month picker + lists of completed / overdue / upcoming milestones, donut charts.
- **Date Logic**: `src/shared/lib/date-engine/index.ts` (Handle with extreme care, heavily tested!)
- **Nightly CRON (Wave 20 + 21)**: `supabase/functions/nightly-sync/` (see its `README.md`) — owns urgency-status transitions (`not_started → in_progress → due_soon → overdue`) using per-project `settings.due_soon_threshold`. The app-layer Date Engine no longer writes status to the DB. **Wave 21 added a third pass**: fires matching `settings.recurrence` rules on template tasks and deep-clones them into their target project via `clone_project_template`. Idempotency stamp on the spawned root: `settings.spawnedFromTemplate` + `settings.spawnedOn` (UTC `YYYY-MM-DD`).
- **Recurring Tasks (Wave 21)**: Template-only recurrence rules at `tasks.settings.recurrence` — `{ kind: 'weekly', weekday: 0..6, targetProjectId }` or `{ kind: 'monthly', dayOfMonth: 1..28, targetProjectId }` (day-of-month capped at 28 to sidestep Feb/leap edges). UI: `src/features/tasks/components/RecurrencePicker.tsx` (rendered inside `TaskForm` only when `origin === 'template'`). Evaluator: `src/shared/lib/recurrence.ts` with a Deno mirror at `supabase/functions/_shared/recurrence.ts` — keep the two files in lock-step. Flat form fields are normalised to the nested JSONB shape via `src/features/tasks/lib/recurrence-form.ts` inside `TaskList`'s submit wrapper.
- **Supervisor Report (Wave 22, live via Resend)**: `supabase/functions/supervisor-report/` (see its `README.md`) — builds a monthly Project Status Report payload for every root task with `supervisor_email` set and POSTs it via `supabase/functions/_shared/email.ts` when `EMAIL_PROVIDER_API_KEY` and `RESEND_FROM_ADDRESS` are both set. Accepts an optional `{ project_id?, dry_run? }` JSON body (powers the "Send test report" button in `EditProjectModal`). Response includes a `dispatch_failures` counter. Degrades cleanly to log-only when the env vars are unset or `dry_run: true`. Keep the payload shape in sync with `src/features/projects/hooks/useProjectReports.ts`.
- **Library dedupe (Wave 22)**: `Task.clone` stamps `settings.spawnedFromTemplate` onto the cloned root (non-fatal, mirrors the nightly-sync recurrence convention). `useMasterLibrarySearch` accepts an `excludeTemplateIds` set and exposes an `exclusionDrained` flag so the combobox can branch its empty-state copy to "All matching templates are already in this project." `TaskList` and `pages/Project` derive the exclude set from their loaded project hierarchy (no extra round trip).
- **Coaching task tagging (Wave 22)**: tasks carry `settings.is_coaching_task: boolean`; the owner/editor-gated checkbox lives in `src/features/tasks/components/TaskFormFields.tsx` (`membershipRole` threaded via `TaskDetailsPanel` → `TaskForm` → `TaskFormFields`); submit-time normalisation in `src/features/tasks/lib/coaching-form.ts`. `TaskDetailsView` renders a "Coaching" badge when the flag is true. DB: one additive RLS UPDATE policy `"Enable update for coaches on coaching tasks"` (see `docs/db/migrations/2026_04_17_coaching_task_rls.sql`) grants project coaches UPDATE access to tagged non-template rows. The existing owner/editor/admin policy is untouched.
- **Coaching task auto-assignment (Wave 23)**: BEFORE INSERT/UPDATE trigger `trg_set_coaching_assignee` on `public.tasks` (function `public.set_coaching_assignee`). When `settings.is_coaching_task = true` and `assignee_id IS NULL`, the trigger looks up `project_members WHERE project_id = COALESCE(NEW.root_id, NEW.id) AND role = 'coach'` and assigns if exactly one coach exists. Zero or multiple coaches → no-op; caller-supplied `assignee_id` is always respected. The UI picks up the server-assigned coach via `useUpdateTask` / `useCreateTask` `onSettled` cache invalidation of `['projectHierarchy', rootId]`. Migration: `docs/db/migrations/2026_04_17_coaching_auto_assign.sql`.
- **Resource Library**: `src/features/projects/components/ResourceLibrary.tsx` +
  `src/features/projects/hooks/useProjectResources.ts` — project-scoped resource browser tab (search + type filter). Data fetched via `planterClient.entities.TaskResource.listByProject(projectId)`, which uses a Supabase `!inner` join on `tasks.root_id`. Returns `ResourceWithTask[]` (defined in `src/shared/db/app.types.ts`).
- **Project Settings Modal**: `src/features/projects/components/EditProjectModal.tsx` — edits title, description, start date, due date, and `due_soon_threshold` (stored in `tasks.settings` JSONB). The `location` field has been deprecated and removed from the UI. **Wave 21.5**: also exposes an Archive / Unarchive toggle that flips `status` to/from `'archived'` via `useUpdateProjectStatus`.
- **Project Switcher (Wave 21.5)**: `src/features/projects/components/ProjectSwitcher.tsx` — header-level Shadcn `DropdownMenu` listing active projects (`status !== 'archived' && !is_complete`). "Show archived" toggle reveals archived entries inline; selection routes to `/project/:id` via `useNavigate`. Reads its data via `useTaskQuery` to stay inside FSD boundaries.
- **Task Details Pane (Wave 21.5)**: `src/features/tasks/components/TaskDetailsView.tsx` now surfaces a "Related Tasks" section between Dependencies and Subtasks (siblings fetched via `useTaskSiblings` → `planter.entities.Task.listSiblings`, excludes current task, ordered by `position`). The prior bare `mailto:` button is replaced with an "Email details" Dialog (`react-hook-form` + zod, readonly body built with `formatDisplayDate`); recipients persist on `user_metadata.saved_email_addresses` via `AuthContext.rememberEmailAddress`.
- **Settings Page**: `src/pages/Settings.tsx` + `src/features/settings/hooks/useSettings.ts` — Profile tab (name, avatar, role, org, email prefs) and Security tab (password change). Password change calls `planter.auth.changePassword(newPassword)`.

## 3a. Key Behavioral Contracts (Wave 18)

### Milestone / Phase Auto-Completion (§3.3)
`planterClient.entities.Task.updateStatus(taskId, 'completed')` now:
1. **Cascades DOWN**: marks all descendant tasks as `completed` (recursive, batched in groups of 3 via `Promise.all`).
2. **Bubbles UP via `reconcileAncestors(parentId, depth)`**: after the cascade, checks whether all siblings of `taskId` are `completed`. If so, marks the parent (`is_complete: true, status: 'completed'`). If not, derives the parent's status via `deriveParentStatus(children)` (priority order: `blocked` > `in_progress` > `overdue` > `todo`) and sets `is_complete: false`. Recurses up the tree **depth-capped at 1** (i.e., `if (depth > 1) return` — processes the immediate parent and grandparent only). This is the app-level equivalent of the DB `check_phase_unlock` trigger.
3. **Re-open behavior**: when a task moves OUT of `completed` (e.g., checkbox unchecked), `reconcileAncestors` is still called. Any ancestor that previously auto-completed is automatically un-completed with a derived status (`is_complete: false`, status = `deriveParentStatus`). This prevents stale "completed" parents when a child is re-opened.

`useUpdateTask` routes **status-only** mutations through `updateStatus` (vs. the raw `Task.update`) so every checkbox toggle in the UI fires the full cascade/bubble pipeline. Mixed-field updates (e.g., form saves that include status + title) bypass this path and use the generic update.

**Completion-flag invariant (Wave 23):** `is_complete === (status === 'completed')` is enforced *unconditionally* at the DB layer by the `sync_task_completion_flags` BEFORE INSERT/UPDATE trigger on `public.tasks` (migration: `docs/db/migrations/2026_04_17_sync_task_completion.sql`). **`status` is the source of truth** — any dual-field write with inconsistent values is reconciled to match `status`, not accepted verbatim. Accordingly, `updateStatus` and `reconcileAncestors` now send **only** `status` on every server payload; `is_complete` is derived by the trigger. React Query optimistic caches still hold both fields locally because the UI reads both — the trim is server-facing only.

### Date Bubble-up (§3.3)
`planterClient.entities.Task.updateParentDates(parentId)` is now called automatically:
- **After task create** — always, when the new task has a parent.
- **After task edit** — when `start_date` or `due_date` is part of the update payload.
- **After task delete** — always, when the deleted task had a parent (parent ID captured from React Query cache in `onMutate` before optimistic removal).

This is wired in `src/features/tasks/hooks/useTaskMutations.ts` (`useCreateTask`, `useUpdateTask`, `useDeleteTask` `onSettled` callbacks).

## 4. Testing & Verification

- **Unit/Integration**: `npm test` (Vitest).
- **E2E Tests**: `npm run test:e2e` (Playwright BDD — feature files in `Testing/e2e/features/`).
- **Linting**: `npm run lint` (Zero-tolerance for errors, including `noUnusedLocals`).

## 5. Deployment / Build

- **Build**: `npm run build` (tsc -b && vite build).
- **Environment**: Local Supabase (`127.0.0.1:54321`) mimics Sync/Realtime.

## 6. Ignorable Files (Context Noise)

The following files are generated or tracked for AI context but are not critical
for a human code review. They can be safely ignored to save focus:

- **`.ai-ignore/docs/FULL_ARCHITECTURE.md`**: Monolithic legacy architecture file. Replaced completely by `docs/architecture/`.
- **`docs/db/drafts/*`**: Work-in-progress SQL scripts.
- **`.antigravity/*`**: AI Agent configuration, rules, and workflows.
- **`archive/*`**: Old code and documentation.
- **`supabase/seeds/*`**: Large seed files (unless modifying data
  initialization).