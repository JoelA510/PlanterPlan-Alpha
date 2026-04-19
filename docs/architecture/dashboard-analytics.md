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

## Integration Points
* **Date Engine:** Sources calculations for 'Due Soon' and 'Overdue' task arrays.
* **Projects & Phases:** Supplies the hierarchical data required to build the pipeline board.

## Known Gaps / Technical Debt
* Implementation of Donut Charts specifically for Checkpoint-based project phases is pending full UI integration.