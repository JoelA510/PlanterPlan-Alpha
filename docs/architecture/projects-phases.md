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

## Integration Points
* **Dashboard & Analytics:** Dashboard heavily queries Project completeness metrics to render the Pipeline Board.
* **Date Engine:** Project settings define the bounds and horizons applied to all child elements.

## Known Gaps / Technical Debt
* **Template Immutability:** Logic to prevent users from deleting specific items that originated from a Master Template (allowing deletion only for custom post-instantiation additions) is not yet fully enforced.