import { useDeepCompareMemo } from 'use-deep-compare';
import { useTaskDrag } from '@/features/task-drag';

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

    // Flatten and deduplicate all known tasks for DnD context (Roots + Hydrated Subtasks)
    const allTasks = useDeepCompareMemo(() => {
        const descendants = Object.values(hydratedProjects).flat();
        const combined = [...tasks, ...descendants];

        // Deduplicate by ID to prevent DnD-kit layout issues
        return Array.from(new Map(combined.map(t => [t?.id, t])).values());
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
