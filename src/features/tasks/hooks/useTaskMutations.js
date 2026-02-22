import { useCallback } from 'react';
import { supabase } from '@/shared/db/client';
import { planter } from '@/shared/api/planterClient';
import { deepCloneTask, updateParentDates } from '@/features/tasks/services/taskService';
import { POSITION_STEP } from '@/app/constants/index';
// Replaced inline date logic with helpers
import { constructCreatePayload, constructUpdatePayload } from '@/shared/lib/date-engine/payloadHelpers';
import { toIsoDate } from '@/shared/lib/date-engine';

export const useTaskMutations = ({
  tasks,
  fetchTasks,
  fetchProjects,
  refreshProjectDetails,
  findTask,
  joinedProjects,
  hydratedProjects,
  commitOptimisticUpdate,
}) => {
  /* Helper to refresh the appropriate context (Root Project or Global List) */
  const _refreshTaskContext = useCallback(
    async (task) => {
      // If we have a task object, try to find its root project
      if (task) {
        const rootId =
          task.root_id || (task.parent_task_id ? findTask(task.parent_task_id)?.root_id : null);

        // If it belongs to a project tree, refresh that project's details
        if (rootId) {
          await refreshProjectDetails(rootId);
          return;
        }
      }
      // Fallback: Refresh the global/flat list if no root context found or if it's a root
      await fetchTasks();
    },
    [findTask, refreshProjectDetails, fetchTasks]
  );

  const createTaskOrUpdate = useCallback(
    async (formData, formState) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const origin = formState.origin || 'instance';
        const parentId = formState.parentId ?? null;
        const daysVal = formData.days_from_start;
        const parsedDays =
          daysVal === '' || daysVal === null || daysVal === undefined ? null : Number(daysVal);

        if (parsedDays !== null && Number.isNaN(parsedDays))
          throw new Error('Invalid days_from_start');

        const manualStartDate = toIsoDate(formData.start_date);
        const manualDueDate = toIsoDate(formData.due_date);
        const hasManualDates = Boolean(manualStartDate || manualDueDate);

        // Helper to locate siblings context
        let contextTasks = tasks;
        let rootId = null;

        if (parentId) {
          // If parent exists, we must find the project context.
          const parent = findTask(parentId);
          if (parent) {
            rootId = parent.root_id || parent.id;
            if (rootId) {
              contextTasks = hydratedProjects[rootId] || [];
              const rootTask =
                tasks.find((t) => t.id === rootId) || joinedProjects.find((t) => t.id === rootId);
              if (rootTask) contextTasks = [...contextTasks, rootTask];
            }
          }
        } else {
          // Creating a root project
          contextTasks = tasks;
        }

        if (formState.mode === 'edit' && formState.taskId) {
          const currentTask = findTask(formState.taskId) || {};
          const updates = constructUpdatePayload(formData, currentTask, {
            origin,
            parentId: formState.parentId,
            contextTasks
          });

          const { error: updateError } = await planter.entities.Task.update(formState.taskId, updates);
          if (updateError) throw updateError;

          if (rootId) await refreshProjectDetails(rootId);
          else await fetchProjects(1); // Refresh list if root updated

          // Trigger Date Inheritance
          if (parentId && origin === 'instance') {
            await updateParentDates(parentId);
            // Re-refresh to show parent updates?
            if (rootId) await refreshProjectDetails(rootId);
          }
          return;
        }

        const siblings = contextTasks.filter(
          (task) => task.origin === origin && (task.parent_task_id || null) === parentId
        );
        const maxPosition =
          siblings.length > 0 ? Math.max(...siblings.map((task) => task.position ?? 0)) : 0;

        const insertPayload = constructCreatePayload(formData, {
          origin,
          parentId,
          rootId,
          contextTasks,
          userId: user.id,
          maxPosition
        });

        if (formData.templateId) {
          const { data: newTasks, error: cloneError } = await deepCloneTask(
            formData.templateId,
            parentId,
            origin,
            user.id,
            {
              title: formData.title,
              description: formData.description,
              start_date: hasManualDates ? manualStartDate : null,
              due_date: hasManualDates ? manualDueDate || manualStartDate : null,
            }
          );
          if (cloneError) throw cloneError;
          if (
            newTasks &&
            newTasks.new_root_id &&
            parsedDays !== null
          ) {
            const updates = { days_from_start: parsedDays, updated_at: new Date().toISOString() };
            if (origin === 'instance' && parsedDays !== null)
              Object.assign(
                updates,
                calculateScheduleFromOffset(contextTasks, parentId, parsedDays)
              );
            const { error: updateError } = await planter.entities.Task.update(newTasks.new_root_id, updates);
            if (updateError) console.error('Error updating cloned root schedule', updateError);
          }
        } else {
          const { error: insertError } = await planter.entities.Task.create(insertPayload);
          if (insertError) throw insertError; // planter.create returns object or throws? createEntityClient returns data. We need to handle error if it doesn't throw.
          // actually createEntityClient uses retryOperation which usually returns data. 
          // If insert fails, it likely throws.
          // But let's check return signatures. createEntityClient.create returns data.
          // If we need error checking:
          // const data = await ...
          // if (!data) throw new Error('Insert failed');
        }

        if (rootId) await refreshProjectDetails(rootId);
        else await fetchProjects(1); // Refresh roots if new project

        // Trigger Date Inheritance
        if (parentId && origin === 'instance') {
          await updateParentDates(parentId);
          if (rootId) await refreshProjectDetails(rootId);
        }

      } catch (error) {
        console.error('Error saving task:', error);
        if (commitOptimisticUpdate && formState?.taskId) {
          commitOptimisticUpdate(formState.taskId);
        }
        throw error;
      }
    },
    [tasks, joinedProjects, hydratedProjects, fetchProjects, refreshProjectDetails, findTask]
  );

  const deleteTask = useCallback(
    async (taskOrId) => {
      try {
        const taskId = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
        const task = typeof taskOrId === 'object' ? taskOrId : findTask(taskId);
        const parentId = task ? task.parent_task_id : null;

        const { error: deleteError } = await planter.entities.Task.delete(taskId);
        if (deleteError) throw deleteError;

        await _refreshTaskContext(task);

        // Trigger Date Inheritance
        if (parentId && task && task.origin === 'instance') {
          await updateParentDates(parentId);
          await _refreshTaskContext(findTask(parentId));
        }

      } catch (error) {
        console.error('Error deleting task:', error);
        if (commitOptimisticUpdate) {
          // For delete, we might need to know the ID if we supported optimistic delete.
          // Currently generic findTask uses ID.
          const taskId = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
          commitOptimisticUpdate(taskId);
        }
        throw error;
      }
    },
    [findTask, _refreshTaskContext]
  );

  const updateTask = useCallback(
    async (taskId, updates) => {
      try {
        const task = findTask(taskId);
        const oldParentId = task ? task.parent_task_id : null;

        const { error } = await planter.entities.Task.update(taskId, updates);
        if (error) throw error;

        await _refreshTaskContext(task);

        // Trigger Date Inheritance
        if (task && task.origin === 'instance') {
          // 1. If date changed, update parent
          if (updates.start_date !== undefined || updates.due_date !== undefined) {
            if (task.parent_task_id) await updateParentDates(task.parent_task_id);
          }
          // 2. If parent changed, update OLD and NEW parent
          if (updates.parent_task_id !== undefined && updates.parent_task_id !== oldParentId) {
            if (oldParentId) await updateParentDates(oldParentId);
            if (updates.parent_task_id) await updateParentDates(updates.parent_task_id);
          }
          // Refresh to show recursive changes
          await _refreshTaskContext(task);
        }
      } catch (error) {
        console.error('Error updating task:', error);
        if (commitOptimisticUpdate) {
          commitOptimisticUpdate(taskId);
        }
        throw error;
      }
    },
    [findTask, _refreshTaskContext]
  );

  return {
    createTaskOrUpdate,
    deleteTask,
    updateTask,
  };
};
