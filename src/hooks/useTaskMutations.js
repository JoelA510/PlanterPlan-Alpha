import { useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { deepCloneTask } from '../services/taskService';
import { calculateScheduleFromOffset, toIsoDate } from '../utils/dateUtils';
import { POSITION_STEP } from '../constants';

export const useTaskMutations = ({
  tasks,
  fetchTasks,
  fetchProjects,
  refreshProjectDetails,
  findTask,
  joinedProjects,
  hydratedProjects,
}) => {
  const createProject = useCallback(
    async (formData) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Use tasks provided in props/args
        const instanceTasks = tasks.filter((t) => t.origin === 'instance' && !t.parent_task_id);
        const maxPosition =
          instanceTasks.length > 0 ? Math.max(...instanceTasks.map((t) => t.position ?? 0)) : 0;
        const projectStartDate = toIsoDate(formData.start_date);
        if (!projectStartDate) throw new Error('A valid project start date is required');

        if (formData.templateId) {
          const { data: newTasks, error: cloneError } = await deepCloneTask(
            formData.templateId,
            null,
            'instance',
            user.id,
            {
              title: formData.title,
              description: formData.description,
              start_date: projectStartDate,
              due_date: projectStartDate,
            }
          );
          if (cloneError) throw cloneError;
          await fetchTasks();
          return newTasks;
        } else {
          const { data, error: insertError } = await supabase
            .from('tasks')
            .insert([
              {
                title: formData.title,
                description: formData.description ?? null,
                purpose: formData.purpose ?? null,
                actions: formData.actions ?? null,
                notes: formData.notes ?? null,
                days_from_start: null,
                origin: 'instance',
                creator: user.id,
                parent_task_id: null,
                position: maxPosition + 1000,
                is_complete: false,
                start_date: projectStartDate,
                due_date: projectStartDate,
              },
            ])
            .select()
            .single();
          if (insertError) throw insertError;
          await fetchTasks();
          return data;
        }
      } catch (error) {
        console.error('Error creating project:', error);
        throw error;
      }
    },
    [tasks, fetchTasks]
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

  const deleteTask = useCallback(
    async (task) => {
      try {
        const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);
        if (deleteError) throw deleteError;
        await fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    },
    [fetchTasks]
  );

  return {
    createProject,
    createTaskOrUpdate,
    deleteTask,
  };
};
