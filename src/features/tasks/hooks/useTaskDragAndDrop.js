import { useMemo } from 'react';
import { useTaskDrag } from '@features/task-drag';

/**
 * useTaskDragAndDrop
 * 
 * Manages the Drag-and-Drop capabilities for the Task Board.
 * 
 * @returns {Object} { sensors, handleDragEnd, allTasks }
 */
export const useTaskDragAndDrop = ({
    tasks,
    hydratedProjects,
    setTasks,
    fetchTasks,
    currentUserId,
    updateTask,
    handleOptimisticUpdate,
    commitOptimisticUpdate
}) => {

    // Flatten all known tasks for DnD context (Roots + Hydrated Subtasks)
    const allTasks = useMemo(() => {
        const descendants = Object.values(hydratedProjects).flat();
        return [...tasks, ...descendants];
    }, [tasks, hydratedProjects]);

    // Use the existing shared drag hook
    const { sensors, handleDragEnd } = useTaskDrag({
        tasks: allTasks,
        setTasks,
        fetchTasks,
        currentUserId,
        updateTaskStatus: (taskId, status) => updateTask(taskId, { status }),
        handleOptimisticUpdate,
        commitOptimisticUpdate,
    });

    return {
        sensors,
        handleDragEnd,
        allTasks,
    };
};
