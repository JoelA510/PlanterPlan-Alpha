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
  * Exportable static data (e.g., via `export-utils.ts`).
* **Admin Notifications:** Automated dispatch to Admins upon new project creation.

## Integration Points
* **Date Engine:** Sources calculations for 'Due Soon' and 'Overdue' task arrays.
* **Projects & Phases:** Supplies the hierarchical data required to build the pipeline board.

## Known Gaps / Technical Debt
* Implementation of Donut Charts specifically for Checkpoint-based project phases is pending full UI integration.