import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { toast } from 'sonner';

import { updateTasksBatch } from '../lib/drag/positionService';
import type { TaskPositionUpdate } from '../lib/drag/positionService';
import { calculateDropTarget } from '../lib/drag/dragDropUtils';
import type { DragTask } from '../lib/drag/dragDropUtils';
import { calculateDateDeltas } from '../lib/drag/dateInheritance';
import {
  addDaysToDate,
  getDaysDifference,
  formatDate,
  parseIsoDate,
} from '@/shared/lib/date-engine';

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
  moveError: string | null;
  setMoveError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Manages the Drag-and-Drop capabilities for the Task Board, handling
 * position renormalization and descendant date inheritance.
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
  const [moveError, setMoveError] = useState<string | null>(null);

  // Flatten and deduplicate all known tasks for DnD context
  const allTasks = useMemo(() => {
    const descendants = Object.values(hydratedProjects).flat();
    const combined = [...tasks, ...descendants];

    return Array.from(new Map(combined.map((t) => [t?.id, t])).values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tasks), JSON.stringify(hydratedProjects)]);

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

        const activeId = String(active.id);
        const overId = String(over.id);

        const activeTask = allTasks.find((t) => t.id === activeId);
        if (!activeTask) return;

        // --- Status Change Logic (Cross-Column) ---
        // Stripped out forced `Record<string, unknown>` casting to expose true type boundaries
        const overData = over.data?.current || {};
        let newStatus: string | null = null;

        if (overData.isColumn) {
          newStatus = String(overData.status);
        } else if (overData.status) {
          newStatus = String(overData.status);
        }

        const isStatusChange = newStatus && newStatus !== 'undefined' && newStatus !== activeTask.status;

        if (isStatusChange) {
          const prevStatus = activeTask.status;
          if (handleOptimisticUpdate) {
            handleOptimisticUpdate(activeId, { status: newStatus });
          } else {
            setTasks((prev) =>
              prev.map((t) => (t.id === activeId ? { ...t, status: newStatus! } : t))
            );
          }
          try {
            await updateTask(activeId, { status: newStatus! });
          } catch (e) {
            console.error('Failed to update status', e);
            if (commitOptimisticUpdate) commitOptimisticUpdate(activeId);
            else if (handleOptimisticUpdate) handleOptimisticUpdate(activeId, { status: prevStatus });
            else setTasks((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: prevStatus } : t)));
            return;
          }
        }

        // --- Position Logic ---
        // Removed messy inline object assertions. We pass standard payload shapes.
        const activePayload = { id: activeId, data: active.data };
        const overPayload = { id: overId, data: over.data };

        // Note: The `as any` casts here expose the calculateDropTarget schema mismatch for Phase B resolution.
        const result = calculateDropTarget(allTasks, activePayload as any, overPayload as any, activeTask.origin);
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
          const oldParent = allTasks.find((t) => t.id === activeTask.parent_task_id);
          const newParent = allTasks.find((t) => t.id === newParentId);

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
                  allTasks,
                  activeId,
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

        // --- Prepare Batch Update ---
        const updatesToApply: TaskPositionUpdate[] = [];

        const activeUpdate: TaskPositionUpdate = {
          id: activeId,
          position: newPos,
          parent_task_id: newParentId,
        };
        
        if (newActiveDate) {
          activeUpdate.start_date = newActiveDate;
        }
        
        updatesToApply.push(activeUpdate);
        updatesToApply.push(...dateUpdates);

        // --- Optimistic Updates ---
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
            commitOptimisticUpdate(activeId);
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
    [allTasks, fetchTasks, setTasks, updateTask, handleOptimisticUpdate, commitOptimisticUpdate]
  );

  return {
    sensors,
    handleDragEnd,
    allTasks,
    moveError,
    setMoveError,
  };
};