import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useState } from 'react';
import { updateTasksBatch } from '../lib/drag/positionService';
import type { TaskPositionUpdate } from '../lib/drag/positionService';
import { calculateDropTarget } from '../lib/drag/dragDropUtils';
import type { DragTask } from '../lib/drag/dragDropUtils';
import { calculateDateDeltas } from '../lib/drag/dateInheritance';
import { addDaysToDate, getDaysDifference, formatDate, parseIsoDate } from '@/shared/lib/date-engine';
import { toast } from 'sonner';

interface UseTaskDragParams {
    tasks: DragTask[];
    setTasks: React.Dispatch<React.SetStateAction<DragTask[]>>;
    fetchTasks: () => Promise<void>;
    updateTaskStatus?: (taskId: string, status: string) => Promise<void>;
    handleOptimisticUpdate?: (taskId: string, updates: Partial<DragTask>) => void;
    commitOptimisticUpdate?: (taskId: string) => void;
}

interface UseTaskDragReturn {
    sensors: SensorDescriptor<SensorOptions>[];
    handleDragEnd: (event: DragEndEvent) => Promise<void>;
    moveError: string | null;
    setMoveError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useTaskDrag = ({
    tasks,
    setTasks,
    fetchTasks,
    updateTaskStatus,
    handleOptimisticUpdate,
    commitOptimisticUpdate,
}: UseTaskDragParams): UseTaskDragReturn => {
    const [moveError, setMoveError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            try {
                const { active, over } = event;

                if (!over || active.id === over.id) {
                    return;
                }

                const activeTask = tasks.find((t) => t.id === active.id);
                if (!activeTask) return;

                // --- Status Change Logic (Cross-Column) ---
                const overData = (over.data?.current || {}) as Record<string, unknown>;
                let newStatus: string | null = null;

                if (overData.isColumn) {
                    newStatus = overData.status as string;
                } else if (overData.status) {
                    newStatus = overData.status as string;
                }

                const isStatusChange = newStatus && newStatus !== activeTask.status;

                if (isStatusChange && updateTaskStatus) {
                    const prevStatus = activeTask.status;
                    if (handleOptimisticUpdate) {
                        handleOptimisticUpdate(active.id as string, { status: newStatus! });
                    } else {
                        setTasks((prev) =>
                            prev.map((t) => (t.id === active.id ? { ...t, status: newStatus! } : t))
                        );
                    }
                    try {
                        await updateTaskStatus(active.id as string, newStatus!);
                    } catch (e) {
                        console.error('Failed to update status', e);
                        if (commitOptimisticUpdate) commitOptimisticUpdate(active.id as string);
                        else if (handleOptimisticUpdate) handleOptimisticUpdate(active.id as string, { status: prevStatus });
                        else setTasks((prev) => prev.map((t) => (t.id === active.id ? { ...t, status: prevStatus } : t)));
                        return;
                    }
                }

                // --- Position Logic ---
                const result = calculateDropTarget(tasks, active as { id: string; data?: { current?: Record<string, unknown> } }, over as { id: string; data?: { current?: Record<string, unknown> } }, activeTask.origin);
                if (!result.isValid) return;

                const { newPos, newParentId } = result;
                if (newPos === null || newPos === undefined) {
                    console.warn('Position collision, simple dnd aborting for safety.');
                    return;
                }

                // --- Date Cascade Logic ---
                const dateUpdates: TaskPositionUpdate[] = [];
                let newActiveDate: string | null = null;

                if (newParentId !== activeTask.parent_task_id) {
                    const oldParent = tasks.find((t) => t.id === activeTask.parent_task_id);
                    const newParent = tasks.find((t) => t.id === newParentId);

                    if (oldParent?.start_date && newParent?.start_date && activeTask.start_date) {
                        const oldPD = parseIsoDate(oldParent.start_date);
                        const newPD = parseIsoDate(newParent.start_date);
                        const activeD = parseIsoDate(activeTask.start_date);

                        if (oldPD && newPD && activeD) {
                            const diffDays = getDaysDifference(newPD, oldPD);
                            if (diffDays !== 0) {
                                const calculatedDate = addDaysToDate(activeD, diffDays as number);
                                newActiveDate = formatDate(calculatedDate, 'yyyy-MM-dd');

                                const descendantUpdates = calculateDateDeltas(
                                    tasks,
                                    active.id as string,
                                    activeTask.start_date,
                                    newActiveDate
                                );
                                dateUpdates.push(
                                    ...descendantUpdates.map((u) => ({ ...u, position: 0 }))
                                );
                            }
                        }
                    }
                }

                // Prepare Batch Update
                const updatesToApply: TaskPositionUpdate[] = [];

                const activeUpdate: TaskPositionUpdate = {
                    id: active.id as string,
                    position: newPos,
                    parent_task_id: newParentId,
                };
                if (newActiveDate) {
                    activeUpdate.start_date = newActiveDate;
                }
                updatesToApply.push(activeUpdate);
                updatesToApply.push(...dateUpdates);

                // Optimistic Updates
                if (handleOptimisticUpdate) {
                    updatesToApply.forEach((u) => {
                        handleOptimisticUpdate(u.id, u);
                    });
                } else {
                    setTasks((prev) =>
                        prev.map((t) => {
                            const update = updatesToApply.find((u) => u.id === t.id);
                            if (update) return { ...t, ...update };
                            return t;
                        })
                    );
                }

                try {
                    await updateTasksBatch(updatesToApply);

                    if (dateUpdates.length > 0) {
                        toast.success(`Moved "${activeTask.title}" and updated dates for ${dateUpdates.length} subtasks.`);
                    } else if (newParentId !== activeTask.parent_task_id) {
                        toast.info(`Moved "${activeTask.title}" to new parent.`);
                    }
                    await fetchTasks();
                } catch (e) {
                    console.error('Failed to persist move', e);
                    toast.error('An error occurred while saving the reorder. Reverting changes...');
                    if (commitOptimisticUpdate) {
                        commitOptimisticUpdate(active.id as string);
                    }
                    fetchTasks();
                    setMoveError('Failed to move task. Reverting changes...');
                }
            } catch (globalError) {
                console.error('Unexpected error in handleDragEnd:', globalError);
                toast.error('An unexpected error occurred during drag and drop. Reverting...');
                fetchTasks();
            }
        },
        [tasks, fetchTasks, setTasks, updateTaskStatus, handleOptimisticUpdate, commitOptimisticUpdate]
    );

    return { sensors, handleDragEnd, moveError, setMoveError };
};
