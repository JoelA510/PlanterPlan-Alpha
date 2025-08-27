# Consolidated Pseudo-Code Summary of JavaScript Files

This document consolidates the pseudo-code summaries from the provided JavaScript files (`TaskContext.js`, `Milestone.js`, `TaskDragDropExperiment.js`, and `SortableTask.js`) into a single reference. Each file's components, hooks, and functions are grouped under their respective filenames for clarity. The summaries capture the core logic, inputs, outputs, and key operations without full implementation details.

## TaskContext.js

### Context: TaskContext

### Hook: useTasks()
// Returns context value or throws error if not in provider

### Provider: TaskExperimentProvider({ children })
// Uses state: tasks, loading, error
// Returns <TaskContext.Provider> with value {tasks, loading, error, fetchTasks (placeholder), updateTaskAfterDragDrop, optimisticUpdateHelpers}

// Effect: on mount
// Async loadTasks: fetches all tasks via fetchAllTasks (instance mode), filters top-level milestones, sets tasks
// On error: sets error message
// Finally sets loading false

// Object: optimisticUpdateHelpers
// Function: updateTaskPositionsOptimistic(taskUpdates)
// Maps prevTasks, applies updates from taskUpdates array by id, sets tasks

// Function: reorderTasksOptimistic(draggedId, newParentId, newPosition)
// Maps prevTasks, updates dragged task's parent_task_id and position, sets tasks

// Function: recalculateDatesOptimistic(taskList)
// Copies taskList, filters/sorts top-level milestones
// For each milestone: sets startDate (first is today, else prev due_date)
// Filters/sorts child tasks
// For each child: sets startDate (first is milestone start, else prev due_date), calculates dueDate = start + duration_days (default 1)
// Updates task in array
// Returns updatedTasks

// Function: handleOptimisticDragDrop(draggedId, newParentId, newPosition, oldParentId)
// Maps prevTasks to update dragged task's parent/position
// Calls recalculateDatesOptimistic on updated, sets tasks

## Milestone.js

### Component: Milestone({ milestone, tasks })
// Uses useDroppable: id = milestone.id, data {type: 'milestone', id}
// Filters/sorts milestoneTasks by parent_task_id and position
// Returns div ref=setNodeRef with style, h3 title
// SortableContext items=milestoneTasks ids
// Maps milestoneTasks to SortableTask components

## TaskDragDropExperiment.js

### Component: TaskDragDropExperiment()
// Uses useTasks: tasks, loading, error, updateTaskAfterDragDrop, fetchTasks
// Uses state: activeId
// Sets up sensors: PointerSensor with activation distance 1
// Returns loading/error div if applicable
// Filters top-level tasks as milestones, maps to Milestone components
// If activeTask: DragOverlay with SortableTask

// Effect: on loading change if !loading: calls fetchTasks (but fetchTasks is placeholder)

// Function: onDragStart(event)
// Logs, sets activeId = event.active.id

// Function: onDragMove(event)
// Logs active.id and delta

// Function: onDragEnd(event)
// Logs, sets activeId null
// If no over: return
// Finds activeTask by active.id, if none: error return
// Gets overData
// Sets oldParentId = activeTask.parent_task_id
// If over type 'task': finds overTask, sets newParentId = overTask.parent
// Filters/sorts milestoneTasks by newParent, finds destIndex of overTask
// Sets newPosition = destIndex + 1
// Else if type 'milestone': sets newParentId = overData.id
// Filters/sorts destTasks by newParent, sets newPosition = length
// Calls updateTaskAfterDragDrop(active.id, newParentId, newPosition, oldParentId)

## SortableTask.js

### Component: SortableTask({ task })
// Uses useSortable: id = task.id
// Gets attributes, listeners, setNodeRef, transform, transition, isDragging
// Computes style: transform/transition CSS, padding/margin/background/border/cursor/opacity/willChange/zIndex/position
// Returns div ref=setNodeRef with style, attributes, listeners
// Inner div: task.title, span with start_date/due_date/duration_days (defaults N/A or 1)