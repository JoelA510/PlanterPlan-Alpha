import {
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useCallback, useState, useEffect } from 'react';
import {
    calculateNewPosition,
    renormalizePositions,
    updateTaskPosition,
} from '../services/positionService';

// Internal Helper
const calculateDropTarget = (allTasks, active, over, activeOrigin) => {
    const activeId = active.id;
    const overId = over.id;
    const activeTask = allTasks.find((t) => t.id === activeId);
    if (!activeTask) return { isValid: false };

    // 1. Determine new parent and origin based on drop target ID
    let newParentId = null;
    let targetOrigin = null;
    const overData = over.data?.current || {};

    if (overData.type === 'container') {
        // Dropped into an empty container
        newParentId = overData.parentId; // This might be a task ID or null (for root)
        targetOrigin = overData.origin;

        // Safety check: verify parent exists if it's not a root drop
        if (newParentId && !allTasks.find((t) => t.id === newParentId)) {
            console.warn(`Drop target parent ${newParentId} not found`);
            return { isValid: false };
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
        while (ancestorId) {
            if (ancestorId === activeId) {
                console.warn('Cannot drop a parent into its own child (Circular dependency detected)');
                return { isValid: false };
            }
            const currentAncestorId = ancestorId;
            const ancestor = allTasks.find((t) => t.id === currentAncestorId);
            ancestorId = ancestor ? ancestor.parent_task_id : null;
        }
    }

    // 2. Validate Origin
    if (activeOrigin !== targetOrigin) {
        return { isValid: false };
    }

    // 3. Filter & Sort Siblings
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
            prevTask = siblings[siblings.length - 1];
            nextTask = null;
        } else {
            prevTask = null;
            nextTask = null;
        }
    } else if (activeIndex !== -1 && activeIndex < overIndex) {
        // Reordering in same list: Dragging DOWN
        prevTask = siblings[overIndex];
        nextTask = siblings[overIndex + 1];
    } else {
        // Dragging UP or Reparenting onto a task
        prevTask = siblings[overIndex - 1];
        nextTask = siblings[overIndex];
    }

    const prevPos = prevTask ? (prevTask.position ?? 0) : 0;
    const nextPos = nextTask ? (nextTask.position ?? 0) : null;

    // 5. Calculate New Position
    const newPos = calculateNewPosition(prevPos, nextPos);

    return { isValid: true, newPos, newParentId };
};

export const useTaskDrag = ({ tasks, setTasks, fetchTasks, currentUserId }) => {
    const [moveError, setMoveError] = useState(null);

    useEffect(() => {
        if (moveError) {
            const timer = setTimeout(() => setMoveError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [moveError]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback(
        async (event) => {
            try {
                const { active, over } = event;

                if (!over || active.id === over.id) {
                    return;
                }

                const activeTask = tasks.find((t) => t.id === active.id);
                if (!activeTask) return;

                // Attempt 1: Calculate Position
                let result = calculateDropTarget(tasks, active, over, activeTask.origin);

                if (!result.isValid) {
                    return;
                }

                let { newPos, newParentId } = result;

                // Retry Logic: Renormalization
                if (newPos === null) {
                    console.log('Collision detected. Renormalizing...');
                    const renormalizedSiblings = await renormalizePositions(
                        newParentId,
                        activeTask.origin,
                        currentUserId
                    );

                    // Merge renormalized tasks into current state locally
                    const siblingsMap = new Map(renormalizedSiblings.map((t) => [t.id, t]));
                    const freshTasks = tasks.map((t) => siblingsMap.get(t.id) || t);

                    // Attempt 2: Re-calculate with fresh data
                    result = calculateDropTarget(freshTasks, active, over, activeTask.origin);

                    if (!result.isValid || result.newPos === null) {
                        console.error('Failed to calculate position even after renormalization.');
                        return;
                    }

                    newPos = result.newPos;
                    newParentId = result.newParentId;

                    // Capture state for rollback
                    const previousTasks = [...tasks];

                    // IMPORTANT: Use freshTasks for the optimistic update to ensure consistency
                    setTasks(() =>
                        freshTasks.map((t) => {
                            if (t.id === active.id) {
                                return { ...t, position: newPos, parent_task_id: newParentId };
                            }
                            return t;
                        })
                    );

                    try {
                        await updateTaskPosition(active.id, newPos, newParentId);
                    } catch (e) {
                        console.error('Failed to persist move', e);
                        // ROLLBACK: Revert to previous state immediately
                        setTasks(previousTasks);
                        // Optional: Show a toast here if we had a toast system
                        setMoveError('Failed to move task. Reverting changes...');
                    }
                } else {
                    // Standard optimistic update uses existing state
                    const previousTasks = [...tasks]; // Capture for rollback

                    setTasks((prev) =>
                        prev.map((t) => {
                            if (t.id === active.id) {
                                return { ...t, position: newPos, parent_task_id: newParentId };
                            }
                            return t;
                        })
                    );

                    try {
                        await updateTaskPosition(active.id, newPos, newParentId);
                    } catch (e) {
                        console.error('Failed to persist move', e);
                        // ROLLBACK
                        setTasks(previousTasks);
                        setMoveError('Failed to move task. Reverting changes...');
                    }
                }
            } catch (globalError) {
                console.error('Unexpected error in handleDragEnd:', globalError);
                // Fallback to heavy fetch only on unexpected crashes
                fetchTasks();
            }
        },
        [tasks, fetchTasks, currentUserId, setTasks]
    );

    return { sensors, handleDragEnd, moveError, setMoveError };
};
