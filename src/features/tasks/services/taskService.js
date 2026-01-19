// src/services/taskService.js
// Core task operations and re-exports from specialized modules
//
// This file has been refactored for maintainability:
// - Master Library operations: see taskMasterLibraryService.js
// - Clone operations: see taskCloneService.js
// - Core CRUD operations: remain here

import { supabase } from '@app/supabaseClient.js';

// Re-export from specialized modules for backward compatibility
export {
  fetchMasterLibraryTasks,
  searchMasterLibraryTasks,
} from '@features/library/services/taskMasterLibraryService';
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
/**
 * Update a task's status.
 * RECURSIVE: If status is 'completed' (or whatever the done state is), mark all children as same?
 * User asked for "Auto-mark children complete".
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

    // Auto-mark children logic
    // If we are marking as DONE, maybe mark all children as DONE?
    // Let's implement Top-Down completion.
    if (status === 'completed') {
      // Fetch children IDs
      const { data: children } = await client
        .from('tasks')
        .select('id')
        .eq('parent_task_id', taskId);

      if (children && children.length > 0) {
        // Parallel update for speed
        await Promise.all(
          children.map((child) => updateTaskStatus(child.id, 'completed', client))
        );
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('[taskService.updateTaskStatus] Error:', error);
    return { data: null, error };
  }
};

/**
 * Update a task's position and optionally its parent (reparenting).
 */
export const updateTaskPosition = async (taskId, newPosition, parentId = undefined, client = supabase) => {
  try {
    const updates = { position: newPosition };
    if (parentId !== undefined) {
      updates.parent_task_id = parentId;
    }

    const { data, error } = await client
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[taskService.updateTaskPosition] Error:', error);
    return { data: null, error };
  }
};

/**
 * Recursively updates a parent task's dates based on its children.
 * Bottom-Up Aggregation.
 */
import { calculateMinMaxDates } from '@shared/lib/date-engine';

export const updateParentDates = async (parentId, client = supabase) => {
  if (!parentId) return;

  try {
    // 1. Fetch all direct children
    const { data: children, error: fetchError } = await client
      .from('tasks')
      .select('start_date, due_date')
      .eq('parent_task_id', parentId);

    if (fetchError) throw fetchError;

    // 2. Calculate New Bounds
    const { start_date, due_date } = calculateMinMaxDates(children);

    // 3. Update Parent
    // We only update if values changed to minimize db writes (optimization)
    // But for simplicity/robustness we'll just update. Supabase is fast.
    const { data: parent, error: updateError } = await client
      .from('tasks')
      .update({
        start_date,
        due_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parentId)
      .select('parent_task_id')
      .single();

    if (updateError) throw updateError;

    // 4. Recurse Up
    if (parent && parent.parent_task_id) {
      await updateParentDates(parent.parent_task_id, client);
    }
  } catch (error) {
    console.error('[taskService.updateParentDates] Error:', error);
    // Suppress error to not block the main mutation?
    // Better to log and continue, as this is a background consistency job.
  }
};

// ============================================================================
// Relationship Operations
// ============================================================================

export const getTaskRelationships = async (taskId, client = supabase) => {
  try {
    const { data, error } = await client
      .from('task_relationships')
      .select(`
        *,
        from_task:from_task_id(id, title, status),
        to_task:to_task_id(id, title, status)
      `)
      .or(`from_task_id.eq.${taskId},to_task_id.eq.${taskId}`);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[taskService.getTaskRelationships] Error:', error);
    return { data: null, error };
  }
};

export const addRelationship = async ({ fromId, toId, type = 'relates_to', projectId }, client = supabase) => {
  try {
    const { data, error } = await client
      .from('task_relationships')
      .insert({
        project_id: projectId,
        from_task_id: fromId,
        to_task_id: toId,
        type
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[taskService.addRelationship] Error:', error);
    return { data: null, error };
  }
};

export const removeRelationship = async (relationshipId, client = supabase) => {
  try {
    const { error } = await client
      .from('task_relationships')
      .delete()
      .eq('id', relationshipId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('[taskService.removeRelationship] Error:', error);
    return { error };
  }
};
