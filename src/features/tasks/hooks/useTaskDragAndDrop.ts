import { useDeepCompareMemo } from 'use-deep-compare';
import { useTaskDrag } from './useTaskDrag';
import type { DragTask } from '../lib/drag/dragDropUtils';
import type { DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';

interface UseTaskDragAndDropParams {
    tasks: DragTask[];
    hydratedProjects: Record<string, DragTask[]>;
    setTasks: React.Dispatch<React.SetStateAction<DragTask[]>>;
    fetchTasks: () => Promise<void>;
    updateTask: (taskId: string, updates: Partial<DragTask>) => Promise<void>;
    handleOptimisticUpdate?: (taskId: string, updates: Partial<DragTask>) => void;
    commitOptimisticUpdate?: (taskId: string) => void;
}

interface UseTaskDragAndDropReturn {
    sensors: SensorDescriptor<SensorOptions>[];
    handleDragEnd: (event: DragEndEvent) => Promise<void>;
    allTasks: DragTask[];
}

/**
 * Manages the Drag-and-Drop capabilities for the Task Board.
 */
export const useTaskDragAndDrop = ({
    tasks,
    hydratedProjects,
    setTasks,
    fetchTasks,
    updateTask,
    handleOptimisticUpdate,
    commitOptimisticUpdate,
}: UseTaskDragAndDropParams): UseTaskDragAndDropReturn => {
    // Flatten and deduplicate all known tasks for DnD context
    const allTasks = useDeepCompareMemo(() => {
        const descendants = Object.values(hydratedProjects).flat();
        const combined = [...tasks, ...descendants];

        return Array.from(new Map(combined.map((t) => [t?.id, t])).values());
    }, [tasks, hydratedProjects]);

    const { sensors, handleDragEnd } = useTaskDrag({
        tasks: allTasks,
        setTasks,
        fetchTasks,
        updateTaskStatus: (taskId: string, status: string) => updateTask(taskId, { status }),
        handleOptimisticUpdate,
        commitOptimisticUpdate,
    });

    return {
        sensors,
        handleDragEnd,
        allTasks,
    };
};
