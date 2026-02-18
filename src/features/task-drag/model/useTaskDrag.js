import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useState } from 'react';
import { updateTasksBatch } from '../lib/positionService';
import { calculateDropTarget } from '../lib/dragDropUtils';
import { calculateDateDeltas } from '../lib/dateInheritance';
import { addDays, differenceInCalendarDays, parseISO, isValid, format } from 'date-fns';
import { toast } from '@/shared/ui/use-toast';

export const useTaskDrag = ({ tasks, setTasks, fetchTasks, updateTaskStatus, handleOptimisticUpdate, commitOptimisticUpdate }) => {
  const [moveError, setMoveError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
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

        // --- Status Change Logic (Cross-Column) ---
        const overData = over.data?.current || {};
        let newStatus = null;

        if (overData.isColumn) {
          newStatus = overData.status;
        } else if (overData.status) {
          newStatus = overData.status;
        }

        const isStatusChange = newStatus && newStatus !== activeTask.status;

        if (isStatusChange && updateTaskStatus) {
          // (Existing status logic preserved)
          const prevStatus = activeTask.status;
          if (handleOptimisticUpdate) {
            handleOptimisticUpdate(active.id, { status: newStatus });
          } else {
            setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: newStatus } : t));
          }
          try {
            await updateTaskStatus(active.id, newStatus);
          } catch (e) {
            console.error("Failed to update status", e);
            if (commitOptimisticUpdate) commitOptimisticUpdate(active.id);
            else if (handleOptimisticUpdate) handleOptimisticUpdate(active.id, { status: prevStatus });
            else setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: prevStatus } : t));
            return;
          }
        }

        // --- Position Logic (Reordering & Reparenting) ---
        let result = calculateDropTarget(tasks, active, over, activeTask.origin);
        if (!result.isValid) return;

        let { newPos, newParentId } = result;
        if (newPos === null) {
          console.warn('Position collision, simple dnd aborting for safety.');
          return;
        }

        // --- Date Cascade Logic ---
        const dateUpdates = [];
        let newActiveDate = null;

        // Only trigger cascade if parent changed
        if (newParentId !== activeTask.parent_task_id) {
          const oldParent = tasks.find(t => t.id === activeTask.parent_task_id);
          const newParent = tasks.find(t => t.id === newParentId);

          // Cascade only if both parents exist and have valid dates
          // (If moving from Root or to Root, we skip cascade for now as Root isn't a task)
          if (oldParent?.start_date && newParent?.start_date && activeTask.start_date) {
            const oldPD = parseISO(oldParent.start_date);
            const newPD = parseISO(newParent.start_date);
            const activeD = parseISO(activeTask.start_date);

            if (isValid(oldPD) && isValid(newPD) && isValid(activeD)) {
              const diffDays = differenceInCalendarDays(newPD, oldPD);
              if (diffDays !== 0) {
                // Calculate new date for the active task itself
                const calculatedDate = addDays(activeD, diffDays);
                newActiveDate = format(calculatedDate, 'yyyy-MM-dd');

                // Calculate updates for all descendants based on the active task's shift
                // Pass activeTask.start_date as oldDate and newActiveDate as newDate
                const descendantUpdates = calculateDateDeltas(
                  tasks,
                  active.id,
                  activeTask.start_date,
                  newActiveDate
                );
                dateUpdates.push(...descendantUpdates);
              }
            }
          }
        }

        // Prepare Batch Update
        const updatesToApply = [];

        // 1. active task update
        const activeUpdate = {
          id: active.id,
          position: newPos,
          parent_task_id: newParentId,
        };
        if (newActiveDate) {
          activeUpdate.start_date = newActiveDate;
        }
        updatesToApply.push(activeUpdate);

        // 2. descendant updates
        updatesToApply.push(...dateUpdates);

        // Optimistic Updates
        if (handleOptimisticUpdate) {
          updatesToApply.forEach(u => {
            handleOptimisticUpdate(u.id, u);
          });
        } else {
          setTasks((prev) =>
            prev.map((t) => {
              const update = updatesToApply.find(u => u.id === t.id);
              if (update) return { ...t, ...update };
              return t;
            })
          );
        }

        try {
          // Use bulk update
          await updateTasksBatch(updatesToApply);

          // Success Toast
          if (dateUpdates.length > 0) {
            toast({
              title: "Task Moved & Dates Updated",
              description: `Moved "${activeTask.title}" and updated dates for ${dateUpdates.length} subtasks.`,
              variant: "success",
            });
          } else if (newParentId !== activeTask.parent_task_id) {
            toast({
              title: "Task Moved",
              description: `Moved "${activeTask.title}" to new parent.`,
            });
          }
          await fetchTasks();
        } catch (e) {
          console.error('Failed to persist move', e);
          if (commitOptimisticUpdate) {
            // Revert all affected tasks... logic is complex here for revert.
            // Simpler to rely on refetch for severe errors.
            commitOptimisticUpdate(active.id);
          }
          fetchTasks();
          setMoveError('Failed to move task. Reverting changes...');
        }

      } catch (globalError) {
        console.error('Unexpected error in handleDragEnd:', globalError);
        fetchTasks();
      }
    },
    [tasks, fetchTasks, setTasks, updateTaskStatus, handleOptimisticUpdate, commitOptimisticUpdate]
  );

  return { sensors, handleDragEnd, moveError, setMoveError };
};
