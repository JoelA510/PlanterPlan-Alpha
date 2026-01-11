// src/services/taskService.js
// Core task operations and re-exports from specialized modules
//
// This file has been refactored for maintainability:
// - Master Library operations: see taskMasterLibraryService.js
// - Clone operations: see taskCloneService.js
// - Core CRUD operations: remain here

import { supabase } from '@app/supabaseClient.js';

// Re-export from specialized modules for backward compatibility
export { fetchMasterLibraryTasks, searchMasterLibraryTasks } from '@features/library/services/taskMasterLibraryService';
export { deepCloneTask } from '@features/tasks/services/taskCloneService';

// ============================================================================
// Hierarchy Operations
// ============================================================================

/**
 * Fetch a task and all its descendants (children, grandchildren, etc.)
 * Uses root_id for efficient scoped queries.
 */
export const fetchTaskChildren = async (taskId, client = supabase) => {
  try {
    // 1. Get the task's root_id to identify the project scope
    const { data: targetTask, error: targetError } = await client
      .from('tasks_with_primary_resource')
      .select('id, root_id')
      .eq('id', taskId)
      .single();

    if (targetError) throw targetError;

    // If the task has a root_id, use it. Fallback to taskId if root_id is missing.
    const projectRootId = targetTask.root_id || targetTask.id;

    // 2. Fetch all tasks belonging to this project (same root_id)
    const { data: projectTasks, error: fetchError } = await client
      .from('tasks_with_primary_resource')
      .select('*')
      .eq('root_id', projectRootId);

    if (fetchError) throw fetchError;

    // 3. Filter in-memory to get the specific subtree for 'taskId'
    const descendants = [];
    const queue = [taskId];
    const visited = new Set([taskId]);

    // Include the target task itself
    const rootTask = projectTasks.find((t) => t.id === taskId);
    if (rootTask) descendants.push(rootTask);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = projectTasks.filter((t) => t.parent_task_id === currentId);

      children.forEach((child) => {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          descendants.push(child);
          queue.push(child.id);
        }
      });
    }

    return { data: descendants, error: null };
  } catch (error) {
    console.error('[taskService.fetchTaskChildren] Error:', error);
    return { data: null, error };
  }
};

// ============================================================================
// Core CRUD Operations
// ============================================================================

/**
 * Get all tasks for a user, ordered by position.
 */
export const getTasksForUser = async (userId, client = supabase) => {
  try {
    const { data, error } = await client
      .from('tasks_with_primary_resource')
      .select('*')
      .eq('creator', userId)
      .order('position', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[taskService.getTasksForUser] Error:', error);
    return { data: null, error };
  }
};

/**
 * Update a task's status.
 */
export const updateTaskStatus = async (taskId, status, client = supabase) => {
  try {
    const { data, error } = await client
      .from('tasks')
      .update({ status })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[taskService.updateTaskStatus] Error:', error);
    return { data: null, error };
  }
};
