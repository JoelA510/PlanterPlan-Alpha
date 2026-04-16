# docs/architecture/date-engine.md

## Domain Overview
The Date Engine is an autonomous logic layer that calculates task urgency based on specific time horizons, dynamically adjusts cascading dates, and restricts temporal boundaries based on Project settings and item inheritance.

## Core Entities & Data Models
* **Date Status:** Computed state indicating urgency (Not Yet Due, Current, Due Soon, Overdue).
* **Time Horizons:** Configured globally per project (e.g., `Due soon = 2 days`).
* **Payload Helpers:** Utilities that construct valid date ranges based on parent/child limits.

## State Machines / Lifecycles
### Urgency Status Lifecycle
Calculated dynamically based on system time vs. Task End Dates:
1. **Not Yet Due:** Current date is prior to the active horizon.
2. **Current:** Task is within the active window.
3. **Due Soon:** Task End Date falls within the project's configured `Due soon time horizon`.
4. **Overdue:** Current date has passed the End Date, and the task is not marked complete by either signal (`is_complete === true` **or** `status === 'completed'`).

## Business Rules & Constraints
* **Cascading Logic:** Phase and Milestone due dates are dynamically calculated based on the furthest due dates of their underlying child tasks.
* **Global Date Shifts:** Editing the Project-level due date automatically shifts the due dates of *all* nested Phases, Milestones, and Tasks to preserve relative spacing.
* **Dependency Auto-Adjustment:** Modifying a task date or moving an item via drag-and-drop (`dateInheritance.ts`) strictly conforms to parent bounds and auto-adjusts dependent child items.
* **Template Exclusion:** The Date Engine is entirely disabled for Library Templates. Template tasks use `duration` and `days from start until due`.

## Integration Points
* **Tasks & Subtasks:** The drag-and-drop system relies heavily on the Date Engine to recalculate bounds when items are moved.
* **Dashboard:** Feeds 'Due Soon' and 'Overdue' metrics to `StatsOverview`.

## Known Gaps / Technical Debt
* Algorithms for auto-adjusting dates currently lack logic for skipping weekends and regional holidays.