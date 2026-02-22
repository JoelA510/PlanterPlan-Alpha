import { useCallback } from 'react';
import { supabase } from '@/shared/db/client';
import { useQueryClient } from '@tanstack/react-query';
import { deepCloneTask, deleteTask } from '@/features/tasks/services/taskService';
import { createProject as createProjectService } from '@/features/projects/services/projectService';
import { toIsoDate, recalculateProjectDates } from '@/shared/lib/date-engine';

export const useProjectMutations = ({ tasks, fetchTasks }) => {
  const queryClient = useQueryClient();

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

        let result;
        if (formData.templateId) {
          // Template Cloning Strategy
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
          result = newTasks;
        } else {
          // Default Project Strategy (Target of RLS Fix)
          // Uses the hardened service method that calls 'initialize_default_project' RPC
          result = await createProjectService({
            title: formData.title,
            start_date: projectStartDate,
            creator: user.id
          });
        }

        await fetchTasks();
        // Invalidate TanStack Query cache to update other components (Sidebar, Dashboard)
        queryClient.invalidateQueries(['userProjects']);
        return result;
      } catch (error) {
        console.error('Error creating project:', error);
        throw error;
      }
    },
    [tasks, fetchTasks, queryClient]
  );

  const updateProject = useCallback(
    async (projectId, updates, oldStartDate) => {
      try {
        const { start_date: newStartDateStr } = updates;

        // 1. Prepare standard updates
        const dbUpdates = {
          title: updates.title,
          description: updates.description,
          due_date: updates.launch_date, // Map launch_date -> due_date
          start_date: updates.start_date,
          updated_at: new Date().toISOString(),
          location: updates.location,
        };

        // 2. Perform Top-Down Date Recalculation if Start Date changed
        let batchUpdates = [];
        if (newStartDateStr && oldStartDate && newStartDateStr !== oldStartDate) {
          // Get all project tasks to calculate shifts
          const { data: projectTasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('root_id', projectId);

          batchUpdates = recalculateProjectDates(projectTasks || [], newStartDateStr, oldStartDate);
        }

        // 3. Update Project Root
        const { error } = await supabase
          .from('tasks')
          .update(dbUpdates)
          .eq('id', projectId);
        if (error) throw error;

        // 4. Execute Batch Updates (if any)
        if (batchUpdates.length > 0) {
          const { error: batchError } = await supabase
            .from('tasks')
            .upsert(batchUpdates);
          if (batchError) console.error("Date recalc error", batchError);
        }

        await fetchTasks();
        queryClient.invalidateQueries(['userProjects']);
        return true;
      } catch (error) {
        console.error('Error updating project:', error);
        throw error;
      }
    },
    [fetchTasks, queryClient]
  );

  const deleteProject = useCallback(
    async (projectId) => {
      try {
        const { error } = await deleteTask(projectId);
        if (error) throw error;
        await fetchTasks();
        queryClient.invalidateQueries(['userProjects']);
        return true;
      } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
      }
    },
    [fetchTasks, queryClient]
  );

  return {
    createProject,
    updateProject,
    deleteProject
  };
};
