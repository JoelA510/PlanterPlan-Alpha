# docs/architecture/projects-phases.md

## Domain Overview
This domain defines the highest-level structural containers of the application. Projects group work into distinct lifecycles and strictly govern the hierarchical nesting of work.

## Core Entities & Data Models
* **Project:** The root container.
  * **Fields:** `Name`, `Target Launch Date`, `Date Range`, `Due soon time horizon`.
  * **Metrics:** Aggregated completeness percentage.
* **Phase:** Top-level structural grouping under a Project.
* **Milestone:** Secondary grouping under a Phase, acting as a collection of executable tasks.

## State Machines / Lifecycles
### Project Instantiation Lifecycle
1. **Creation:** Template tree cloned, textual data copied, dates/states mapped to `Target Launch Date`.
2. **Active:** Standard operation. Completing tasks triggers upward recalculation of Milestone and Project completeness.
3. **Deletion:** Triggers a cascading hard delete of all nested descendants and scrubs from dashboards.

### Alternate Architecture: Checkpoint-Based Projects
1. **Locked:** Subsequent phases are visually locked.
2. **Current:** Phase is active and tracking progress visually (Donut Chart) without strict Date Engine due dates.
3. **Unlocked:** A locked Phase transitions to "Current" strictly when the preceding Phase hits 100% completion.

## Business Rules & Constraints
* **Strict Hierarchy Invariant:** `Project -> Phases -> Milestones -> Tasks -> Subtasks`.
* **Deprecation:** Project `Location` field is officially deprecated.

## Archive & Completion Semantics
* **Archived project:** Root task carries `status = 'archived'` (set/cleared via the Archive / Unarchive action in `EditProjectModal`). Archiving is reversible and **never cascades** to descendants — children keep their own status and continue to resolve dates normally.
* **Active project:** Any project root where `status !== 'archived'` **and** `is_complete !== true`. This is the default-visible set for `useDashboard`, `ProjectSidebar`, and `ProjectSwitcher`.
* **Completed project:** Indicated by `is_complete = true` on the root task (and `status !== 'archived'`). Wave 23's `sync_task_completion_flags` DB trigger makes `is_complete === (status === 'completed')` an unconditional invariant (see `tasks-subtasks.md`); the `updateStatus` bubble-up logic keeps the value propagating up the tree. The UI filter inspects `is_complete` only.
* **No auto-archive:** Completing a project does not archive it; archive remains an explicit user action.
* **Reachable behind toggles (Wave 25):** `ProjectSwitcher` exposes two independent toggles — "Show archived" (Wave 21.5) and "Show completed" (Wave 25) — so users can navigate back to either subset without leaving the header dropdown. Toggles are independent: a project that is **both** archived **and** completed is classified as archived by the component's filters, and therefore appears only when "Show archived" is on. Defaults stay OFF; active behavior is unchanged.

## Integration Points
* **Dashboard & Analytics:** Dashboard heavily queries Project completeness metrics to render the Pipeline Board.
* **Date Engine:** Project settings define the bounds and horizons applied to all child elements.

## Known Gaps / Technical Debt
* **Template Immutability:** Logic to prevent users from deleting specific items that originated from a Master Template (allowing deletion only for custom post-instantiation additions) is not yet fully enforced.