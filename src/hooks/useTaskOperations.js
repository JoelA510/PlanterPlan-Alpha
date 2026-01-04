import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { deepCloneTask, getTasksForUser } from '../services/taskService';
import { getJoinedProjects } from '../services/projectService';
import { calculateScheduleFromOffset, toIsoDate } from '../utils/dateUtils';
import { POSITION_STEP } from '../constants';

export const useTaskOperations = () => {
  const [tasks, setTasks] = useState([]);
  const [joinedProjects, setJoinedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinedError, setJoinedError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const isMountedRef = useRef(false);

  // --- Helpers ---

  // Note: Date Ownership Architecture
  // 1. DB Triggers (SOURCE OF TRUTH): Handle 'rollup' logic. If a child task moves, the parent's start/end/duration
  //    are automatically recalculated by PostgreSQL triggers (`update_parent_dates`).
  // 2. Client (OPTIMISTIC / SHIFTING): `days_from_start` logic below is used to explicitly Calculate
  //    new dates when a user changes the offset. We send these specific dates to the DB.
  //    We DO NOT rely on the client to roll up dates to parents; we only calculate the specific task's schedule.

  const fetchTasks = useCallback(async () => {
    if (!isMountedRef.current) return [];

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMountedRef.current) return [];

      if (!user) {
        setError('User not authenticated');
        setTasks([]);
        return [];
      }
      setCurrentUserId(user.id);

      const { data, error: taskError } = await getTasksForUser(user.id);

      if (!isMountedRef.current) return [];

      if (taskError) {
        console.error('Error fetching tasks:', taskError);
        setError('Failed to fetch tasks');
        setTasks([]);
        return [];
      }

      const nextTasks = data || [];
      setTasks(nextTasks);

      // Fetch joined projects
      const { data: joinedData, error: joinedProjectError } = await getJoinedProjects(user.id);
      if (isMountedRef.current) {
        if (joinedProjectError) {
          setJoinedError('Failed to load joined projects');
        }
        setJoinedProjects(joinedData || []);
      }

      return nextTasks;
    } catch (err) {
      if (!isMountedRef.current) return [];
      setError('Failed to fetch tasks');
      return [];
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  const createProject = useCallback(
    async (formData) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const instanceTasks = tasks.filter((t) => t.origin === 'instance' && !t.parent_task_id);
        const maxPosition =
          instanceTasks.length > 0 ? Math.max(...instanceTasks.map((t) => t.position ?? 0)) : 0;
        const projectStartDate = toIsoDate(formData.start_date);

        if (!projectStartDate) throw new Error('A valid project start date is required');

        // If a template was selected, perform a deep clone (RPC)
        if (formData.templateId) {
          // Deep clone (RPC)
          const { data: newTasks, error: cloneError } = await deepCloneTask(
            formData.templateId,
            null, // newParentId (null for root)
            'instance', // newOrigin
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
          return newTasks; // Return the result (containing new_root_id)
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
          return data; // Return the new task object
        }
      } catch (error) {
        console.error('Error creating project:', error);
        throw error;
      }
    },
    [tasks, fetchTasks]
  );

  const saveTask = useCallback(
    async (formData, formState) => {
      // Wraps both create and update logic for tasks
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

        // --- EDIT MODE ---
        if (formState.mode === 'edit' && formState.taskId) {
          let scheduleUpdates = {};
          if (origin === 'instance') {
            if (parsedDays !== null) {
              scheduleUpdates = calculateScheduleFromOffset(tasks, formState.parentId, parsedDays);
            }
            if (hasManualDates) {
              scheduleUpdates = {
                start_date: manualStartDate,
                due_date: manualDueDate || manualStartDate || scheduleUpdates.due_date || null,
              };
            }
            if (!hasManualDates && parsedDays === null) {
              scheduleUpdates = {};
            }
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

          await fetchTasks();
          return;
        }

        // --- CREATE MODE ---
        const siblings = tasks.filter((task) => {
          return task.origin === origin && (task.parent_task_id || null) === parentId;
        });
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
          if (parsedDays !== null) {
            const schedule = calculateScheduleFromOffset(tasks, parentId, parsedDays);
            Object.assign(insertPayload, schedule);
          }
          if (hasManualDates) {
            insertPayload.start_date = manualStartDate;
            insertPayload.due_date =
              manualDueDate || manualStartDate || insertPayload.due_date || null;
          }
        }

        if (formData.templateId) {
          // Deep clone (RPC)
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

          // newTasks is a summary object now with new_root_id.
          // We still need to apply 'days_from_start' logic if it wasn't passed to RPC.
          if (
            newTasks &&
            newTasks.new_root_id &&
            (parsedDays !== null || (origin === 'instance' && parsedDays !== null))
          ) {
            const updates = {
              days_from_start: parsedDays,
              updated_at: new Date().toISOString(),
            };

            if (origin === 'instance' && parsedDays !== null) {
              const schedule = calculateScheduleFromOffset(tasks, parentId, parsedDays);
              Object.assign(updates, schedule);
            }
            // Manual dates handled by RPC override above.

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

        await fetchTasks();
      } catch (error) {
        console.error('Error saving task:', error);
        throw error;
      }
    },
    [tasks, fetchTasks]
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

  useEffect(() => {
    isMountedRef.current = true;
    fetchTasks();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTasks]);

  return {
    tasks,
    setTasks,
    joinedProjects,
    loading,
    error,
    joinedError,
    currentUserId,
    fetchTasks,
    createProject,
    saveTask,
    deleteTask,
  };
};
