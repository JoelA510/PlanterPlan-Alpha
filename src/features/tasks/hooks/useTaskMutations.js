import { useCallback } from 'react';
import { supabase } from '@app/supabaseClient';
import { deepCloneTask } from '@features/tasks/services/taskService';
import { calculateScheduleFromOffset, toIsoDate } from '@shared/lib/date-engine';
import { POSITION_STEP } from '@app/constants/index';

export const useTaskMutations = ({
  tasks,
  fetchTasks,
  fetchProjects,
  refreshProjectDetails,
  findTask,
  joinedProjects,
  hydratedProjects,
}) => {


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
          let scheduleUpdates = {};
          if (origin === 'instance') {
            if (parsedDays !== null) {
              scheduleUpdates = calculateScheduleFromOffset(
                contextTasks,
                formState.parentId,
                parsedDays
              );
            }
            if (hasManualDates) {
              scheduleUpdates = {
                start_date: manualStartDate,
                due_date: manualDueDate || manualStartDate || scheduleUpdates.due_date || null,
              };
            }
            if (!hasManualDates && parsedDays === null) scheduleUpdates = {};
          }

          const updates = {
            title: formData.title,
            description: formData.description ?? null,
            notes: formData.notes ?? null,
            purpose: formData.purpose ?? null,
            actions: formData.actions ?? null,
            days_from_start: parsedDays,
            updated_at: new Date().toISOString(),
            ...scheduleUpdates,
          };

          const { error: updateError } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', formState.taskId);
          if (updateError) throw updateError;

          if (rootId) await refreshProjectDetails(rootId);
          else await fetchProjects(1); // Refresh list if root updated
          return;
        }

        const siblings = contextTasks.filter(
          (task) => task.origin === origin && (task.parent_task_id || null) === parentId
        );
        const maxPosition =
          siblings.length > 0 ? Math.max(...siblings.map((task) => task.position ?? 0)) : 0;

        const insertPayload = {
          title: formData.title,
          description: formData.description ?? null,
          notes: formData.notes ?? null,
          purpose: formData.purpose ?? null,
          actions: formData.actions ?? null,
          days_from_start: parsedDays,
          origin,
          creator: user.id,
          parent_task_id: parentId,
          position: maxPosition + POSITION_STEP,
          is_complete: false,
        };

        if (origin === 'instance') {
          if (parsedDays !== null)
            Object.assign(
              insertPayload,
              calculateScheduleFromOffset(contextTasks, parentId, parsedDays)
            );
          if (hasManualDates) {
            insertPayload.start_date = manualStartDate;
            insertPayload.due_date =
              manualDueDate || manualStartDate || insertPayload.due_date || null;
          }
        }

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
            (parsedDays !== null || (origin === 'instance' && parsedDays !== null))
          ) {
            const updates = { days_from_start: parsedDays, updated_at: new Date().toISOString() };
            if (origin === 'instance' && parsedDays !== null)
              Object.assign(
                updates,
                calculateScheduleFromOffset(contextTasks, parentId, parsedDays)
              );
            const { error: updateError } = await supabase
              .from('tasks')
              .update(updates)
              .eq('id', newTasks.new_root_id);
            if (updateError) console.error('Error updating cloned root schedule', updateError);
          }
        } else {
          const { error: insertError } = await supabase.from('tasks').insert([insertPayload]);
          if (insertError) throw insertError;
        }

        if (rootId) await refreshProjectDetails(rootId);
        else await fetchProjects(1); // Refresh roots if new project
      } catch (error) {
        console.error('Error saving task:', error);
        throw error;
      }
    },
    [tasks, joinedProjects, hydratedProjects, fetchProjects, refreshProjectDetails, findTask]
  );

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

  const deleteTask = useCallback(
    async (taskOrId) => {
      try {
        const taskId = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
        const task = typeof taskOrId === 'object' ? taskOrId : findTask(taskId);

        const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);
        if (deleteError) throw deleteError;

        await _refreshTaskContext(task);
      } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    },
    [findTask, _refreshTaskContext]
  );

  const updateTask = useCallback(
    async (taskId, updates) => {
      try {
        const task = findTask(taskId);
        const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
        if (error) throw error;

        await _refreshTaskContext(task);
      } catch (error) {
        console.error('Error updating task:', error);
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
