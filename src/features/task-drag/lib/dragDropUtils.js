import { calculateNewPosition } from './positionService';

/**
 * Calculates the valid drop target and new position for a dragged task.
 * 
 * @param {Array} allTasks - List of all available tasks
 * @param {Object} active - The DndKit active item
 * @param {Object} over - The DndKit over item
 * @param {string} activeOrigin - The origin of the active task (e.g. 'instance', 'template')
 * @returns {Object} { isValid, newPos, newParentId }
 */
export const calculateDropTarget = (allTasks, active, over, activeOrigin) => {
    const activeId = active.id;
    const overId = over.id;
    const activeTask = allTasks.find((t) => t.id === activeId);

    if (!activeTask) return { isValid: false };

    // 1. Determine new parent and origin based on drop target ID
    let newParentId = null;
    let targetOrigin = null;
    const overData = over.data?.current || {};

    if (overData.type === 'container') {
        // Dropped into an empty container or specifically a container zone
        newParentId = overData.parentId !== undefined ? overData.parentId : (overData.type === 'container' ? overId : null); // This might be a task ID or null (for root/project)
        targetOrigin = overData.origin;

        // Safety check: verify parent exists if it's not a root drop (and not null)
        if (newParentId && !allTasks.find((t) => t.id === newParentId)) {
            // It might be a Project Root ID which isn't in "allTasks" if tasks are just items
            // But typically for "reparenting" to a task, it should be there.
            // If newParentId is the *Project ID*, it won't be in allTasks (which are tasks).
            // We assume the caller handles project-root validity or we trust the overData.
            // For now, we trust overData.parentId if it came from a valid droppable.
        }
    } else {
        // Dropping onto another task item directly
        const overTask = allTasks.find((t) => t.id === overId);
        if (overTask) {
            newParentId = overTask.parent_task_id ?? null;
            targetOrigin = overTask.origin;
        } else {
            return { isValid: false };
        }
    }

    // 1b. Circular Ancestry Check (Grandfather Paradox)
    // If we are reparenting (newParentId is not null), we must ensure
    // that the new parent is not a descendant of the active task.
    if (newParentId) {
        let ancestorId = newParentId;
        // We need to look up ancestors in allTasks.
        // If ancestorId is the project root, it won't be in allTasks, so loop terminates.
        // If ancestorId is a task, we check it.

        // Safety break counter to prevent infinite loops in malformed trees
        let depth = 0;
        while (ancestorId && depth < 100) {
            if (ancestorId === activeId) {
                console.warn('Cannot drop a parent into its own child (Circular dependency detected)');
                return { isValid: false };
            }

            const ancestor = allTasks.find((t) => t.id === ancestorId);
            ancestorId = ancestor ? (ancestor.parent_task_id || null) : null;
            depth++;
        }
    }

    // 2. Validate Origin
    if (activeOrigin !== targetOrigin) {
        return { isValid: false };
    }

    // 3. Filter & Sort Siblings
    // We want tasks that share the same newParentId
    const siblings = allTasks
        .filter((t) => (t.parent_task_id ?? null) === newParentId && t.origin === activeOrigin)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const activeIndex = siblings.findIndex((t) => t.id === activeId);
    const overIndex = siblings.findIndex((t) => t.id === overId);

    // 4. Determine prev/next neighbors
    let prevTask, nextTask;
    const isContainerDrop = overData.type === 'container';

    if (isContainerDrop) {
        // Dropped into container -> Append to end logic
        if (siblings.length > 0) {
            // If we are moving into a container, and we are already in it?
            // siblings includes "active" if it was already there.
            // If we are moving to a NEW container, active isn't in siblings yet?
            // Wait, siblings filter matches newParentId. 
            // If active.parent_task_id !== newParentId, active is NOT in siblings yet.

            // If active is NOT in siblings (new parent), append to end.
            if (activeIndex === -1) {
                prevTask = siblings[siblings.length - 1];
                nextTask = null;
            } else {
                // We are in the container, just dropping "on the container background"?
                // Usually means "move to end"
                prevTask = siblings[siblings.length - 1];
                nextTask = null;
            }
        } else {
            prevTask = null;
            nextTask = null;
        }
    } else {
        // Dropping relative to a sibling
        // If active is NOT in the list (drag from other parent), 
        // overIndex refers to the item we dropped ON.

        // If dragging from outside:
        // Drop `over` item X. Logic usually: place relative to X.
        // dnd-kit sortable logic is complex. 
        // For simplicity in this robust calculation:
        // If overIndex exists, we target that position.

        if (activeIndex !== -1 && activeIndex < overIndex) {
            // Reordering in same list: Dragging DOWN
            prevTask = siblings[overIndex];
            nextTask = siblings[overIndex + 1];
        } else {
            // Dragging UP or Dragging into new list at position X
            prevTask = siblings[overIndex - 1];
            nextTask = siblings[overIndex];
        }
    }

    const prevPos = prevTask ? (prevTask.position ?? 0) : 0;
    const nextPos = nextTask ? (nextTask.position ?? 0) : null;

    // 5. Calculate New Position
    const newPos = calculateNewPosition(prevPos, nextPos);

    return { isValid: true, newPos, newParentId };
};
