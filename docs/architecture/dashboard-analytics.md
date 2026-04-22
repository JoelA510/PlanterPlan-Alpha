# docs/architecture/dashboard-analytics.md

## Domain Overview
The Dashboard & Analytics domain aggregates telemetry across Projects, Tasks, and the Date Engine to provide real-time reporting and pipeline visualization for users and Admins.

## Core Entities & Data Models
* **User Dashboard:** Primary UI split into `Owned Projects` and `Joined Projects`. Contains `ProjectPipelineBoard` and `StatsOverview`.
* **Admin Analytics:** System-wide operational metrics dashboard.
* **Pipeline Math:** The aggregation logic (`pipelineMath.ts`) determining phase/milestone completion ratios.

## State Machines / Lifecycles
### Metrics Recalculation Lifecycle
1. **Task Mutation:** A user changes a task status (e.g., To Do -> Complete).
2. **Local State Update:** Optimistic UI update on the task list.
3. **Pipeline Recalculation:** The mathematical engine recalculates the Milestone and Phase percentages.
4. **Dashboard Broadcast:** Real-time hooks push the updated percentage to the Project Card and Dashboard Overview.

## Business Rules & Constraints
* **Required Visualizations:**
  * Total Projects counts.
  * Task Arrays: Current, Due Soon, Overdue.
  * Status Breakdown: Complete, In Progress, Blocked, Not Started.
  * Progress Charts: Milestone/Phase completion ratios.
* **Reporting Outputs:**
  * Generate chronological "By Month" reports. Shipped in Wave 20 as `src/pages/Reports.tsx` (month picker + donut charts + lists of completed / overdue / upcoming milestones), sourced from `src/features/projects/hooks/useProjectReports.ts`.
  * **Task List Views & Filters (Wave 20):** `/tasks` (`src/pages/TasksPage.tsx`) now exposes filtered task lists via `src/features/tasks/hooks/useTaskFilters.ts` (Priority, Overdue, Due Soon, Current, Not Yet Due, Completed, All, Milestones, My Tasks) with chronological/alphabetical sort.
  * **Supervisor Reports (Wave 21 → Wave 22):** `supabase/functions/supervisor-report/` assembles a monthly Project Status Report payload for every project whose root task carries a `supervisor_email`. Wave 21 shipped log-only; Wave 22 wired live dispatch through Resend via `supabase/functions/_shared/email.ts` (requires both `EMAIL_PROVIDER_API_KEY` and `RESEND_FROM_ADDRESS`; degrades cleanly to log-only otherwise). The function accepts an optional JSON body `{ project_id?, dry_run? }` — `project_id` scopes the run to a single root (powers the "Send test report" button in `EditProjectModal`), `dry_run: true` forces log-only regardless of env. Response grew a `dispatch_failures` counter for partial-delivery alerting. Keep the payload shape in sync with `src/features/projects/hooks/useProjectReports.ts` — the renderer consumes that shape verbatim.
  * Exportable static data (e.g., via `export-utils.ts`).
* **Admin Notifications:** Automated dispatch to Admins upon new project creation.

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

## Realtime Presence (Wave 27)

Per-project presence channel `presence:project:<id>`, opened once in `src/pages/Project.tsx` via `useProjectPresence` and consumed by `<PresenceBar>` in the project header. Each presence row carries `{ user_id, email, joinedAt, focusedTaskId }`.

**Self-hide** — the user never sees their own chip. **Multi-tab dedup** — the same `user_id` from two tabs collapses to one chip, sorted by earliest `joinedAt`.

**Task focus** — `useTaskFocusBroadcast` in `src/features/tasks/components/TaskDetailsPanel.tsx` debounces (250ms) and updates the same presence state with `focusedTaskId`. `TaskItem.tsx` reads `presentUsers` (threaded from the project route via `MilestoneSection`) and renders a chip when any peer's `focusedTaskId === task.id`. No second channel — one channel, one track call, two consumers.

**Disabled** outside the project route — Dashboard, Reports, Tasks, Settings do not open presence channels (`projectId` is only defined on `/project/:id`).

## Gantt Chart (Wave 28)

Standalone route `/gantt?projectId=:id` (registered in `src/app/App.tsx`, lazy-loaded). Reads project hierarchy from the same `useTaskQuery` React Query cache as `TaskList`.

**Stack**: `gantt-task-react@0.3.9` (pinned, no `^`). Bundle impact ~13 KB gzipped, lazy-loaded.

**Adapter** (`src/features/gantt/lib/gantt-adapter.ts`):
* Walks the hierarchy; emits one row per phase, milestone, and (optionally) leaf task.
* **Subtasks always excluded** — max-depth-1 invariant means they roll up.
* Free-floating rows (no derivable bounds) excluded with a `skippedCount` returned alongside for the UI to surface "N tasks excluded".
* **Boundary exemption from no-raw-date-math**: the file constructs `Date` from ISO strings for the library — strictly data marshalling, not math. Internal comparisons still go through `compareDateAsc`/`isBeforeDate` from `date-engine`.

**Drag-to-shift** (`src/features/gantt/hooks/useGanttDragShift.ts`):
* Routes through `useUpdateTask` from `useTaskMutations`. Cascade-up on parent dates is automatic via the Wave 18 `onSettled → updateParentDates` wiring.
* Bounds check before mutation: child cannot exceed parent's bounds; error toast + no mutation if violated.
* On error: force-refetch `['projectHierarchy', projectId]` per styleguide §5.

**Out of scope (this wave)**: Print/PDF (button rendered disabled with tooltip — targeted for the Wave 34 admin tooling); critical-path lines; resource swimlanes; mobile-optimized rendering; weekend/holiday awareness (descoped during the post-Wave-31 roadmap renumber — no wave currently assigned).

## Integration Points
* **Date Engine:** Sources calculations for 'Due Soon' and 'Overdue' task arrays.
* **Projects & Phases:** Supplies the hierarchical data required to build the pipeline board.

## Known Gaps / Technical Debt

## Resolved

* **Donut Charts for Checkpoint-based project phases (resolved Wave 29)**: `PhaseCard.tsx` swaps its progress bar for a recharts `<PieChart>` donut when `extractProjectKind(rootTask) === 'checkpoint'`. Center label is `{progress}%` when unlocked or `Locked` when `phase.is_locked === true`. Fill uses the project's `--color-brand-600` / `--color-slate-200` CSS variables (no raw hex).