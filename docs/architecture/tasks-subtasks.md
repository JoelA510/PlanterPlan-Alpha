# docs/architecture/tasks-subtasks.md

## Domain Overview
This domain governs the atomic execution units within a Project. It provides the interface for task CRUD, status management, dependency mapping, and hierarchical re-organization via drag-and-drop.

## Core Entities & Data Models
* **Task:** The foundational work unit.
  * **Fields:** `Title`, `Description`, `Purpose`, `Actions`, `Additional Resources`, `Start Date`, `End Date`, `Notes`, `Assignee`, `Status`.
* **Subtask:** A child node of a Task.
* **Dependency:** A horizontal link between tasks dictating order of execution.

## State Machines / Lifecycles
### Task Completion Lifecycle
Transitions strictly through: `To Do` -> `In Progress` -> `Complete` -> `Blocked` -> `N/A`.

### Auto-Completion Automation
* Toggling a parent to `Complete` forces a confirmation prompt if dependent sub-items exist. Confirmation cascades `Complete` status to all children.
* Any status toggle instantly recalculates parent Milestone/Project completion percentages.

## Business Rules & Constraints
* **Max Subtask Depth:** Subtasks *cannot* have child tasks (Maximum depth = 1).
  * *Constraint:* If Task A has Subtask X, Task A cannot be dropped into Task B to become a subtask, preventing depth violations.
* **Drag-and-Drop Constraints (`dragDropUtils.ts`):**
  * Items dropped adjacent to peers reorder the list index.
  * A childless Task dropped inside another Task becomes a Subtask.
  * Dragging a Task moves all of its nested Subtasks concurrently.
* **Kanban Board V2 (Wave 20):** Native column-to-column drag-and-drop is implemented in `src/features/tasks/components/board/` (`ProjectBoardView.tsx`, `BoardColumn.tsx`, `BoardTaskCard.tsx`). Drops between columns change task `status`; depth constraints and cycle detection still apply.
* **Dependencies:** Tasks mapped as dependencies cannot be closed out of sequence without throwing a warning.
* **Deletion Invariants:** Deleting an item triggers a warning and cascades a hard delete to all descendants.

## Integration Points
* **Date Engine:** Dragging tasks triggers date inheritance logic (`dateInheritance.ts`) to adjust bounds automatically.
* **Dashboard:** Feeds raw status counts.

## Known Gaps / Technical Debt
* None currently identified.