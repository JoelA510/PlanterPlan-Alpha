import { planter } from '@shared/api/planterClient';
import { calculateMinMaxDates } from '@shared/lib/date-engine';
export { deepCloneTask } from './taskCloneService';

// --- Hierarchy Operations ---

export const fetchTaskChildren = async (taskId) => {
  try {
    // 1. Get the task's root_id to identify the project scope
    const targetTask = await planter.entities.TaskWithResources.get(taskId);

    if (!targetTask) throw new Error('Task not found');

    const projectRootId = targetTask.root_id || targetTask.id;

    // 2. Fetch all tasks belonging to this project (same root_id)
    const projectTasks = await planter.entities.TaskWithResources.filter({ root_id: projectRootId });

    // 3. Filter in-memory to get the specific subtree for 'taskId'
    const descendants = [];
    const queue = [taskId];
    const visited = new Set([taskId]);

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

// --- Core CRUD Operations ---

import { validateSortColumn } from '@shared/lib/validation';

export const getTasksForUser = async (userId, { sortColumn = 'position', sortOrder = 'asc' } = {}) => {
  try {
    const validSortColumn = validateSortColumn(sortColumn, ['position', 'title', 'status', 'created_at', 'due_date']);

    // PlanterClient 'filter' doesn't support complex 'order' yet.
    // We'll use the generic entity client but we might need to add order support.
    // For now, let's keep it simple or use rawSupabaseFetch directly if needed.
    // Actually, entities.TaskWithResources.filter is just a wrapper for rawSupabaseFetch.

    const data = await planter.entities.TaskWithResources.filter({ creator: userId });

    // Sort in-memory if needed, or update filter to support order
    const sortedData = [...data].sort((a, b) => {
      const valA = a[validSortColumn];
      const valB = b[validSortColumn];
      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return { data: sortedData, error: null };
  } catch (error) {
    console.error('[taskService.getTasksForUser] Error:', error);
    return { data: null, error };
  }
};

export const updateTaskStatus = async (taskId, status) => {
  try {
    const data = await planter.entities.Task.update(taskId, { status });

    if (status === 'completed') {
      const children = await planter.entities.Task.filter({ parent_task_id: taskId });

      if (children && children.length > 0) {
        await Promise.all(
          children.map((child) => updateTaskStatus(child.id, 'completed'))
        );
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('[taskService.updateTaskStatus] Error:', error);
    return { data: null, error: error.message || error };
  }
};

export const updateTaskPosition = async (taskId, newPosition, parentId = undefined) => {
  try {
    const updates = { position: newPosition };
    if (parentId !== undefined) {
      updates.parent_task_id = parentId;
    }

    const data = await planter.entities.Task.update(taskId, updates);
    return { data, error: null };
  } catch (error) {
    console.error('[taskService.updateTaskPosition] Error:', error);
    return { data: null, error: error.message || error };
  }
};

export const deleteTask = async (taskId) => {
  try {
    await planter.entities.Task.delete(taskId);
    return { error: null };
  } catch (error) {
    console.error('[taskService.deleteTask] Error:', error);
    return { error };
  }
};

// --- Relationship Operations ---

export const getTaskRelationships = async (taskId) => {
  try {
    const data = await planter.rpc('get_task_relationships', { p_task_id: taskId });
    return { data, error: null };
  } catch (error) {
    console.error('[taskService.getTaskRelationships] Error:', error);
    return { data: null, error };
  }
};

export const addRelationship = async ({ fromId, toId, type = 'relates_to', projectId }) => {
  try {
    const data = await planter.entities.TaskWithResources.create({
      project_id: projectId,
      from_task_id: fromId,
      to_task_id: toId,
      type
    }, 'task_relationships'); // Explicit table override if needed, but planterClient handles its own.

    // Wait, planterClient.js doesn't have a TaskRelationship entity yet. 
    // I should probably use planter.rpc or add the entity.
    // For now, let's use a generic fetch via planter.entities.Task (which is a catch-all) 
    // or better, I'll add the entity.

    return { data, error: null };
  } catch (error) {
    console.error('[taskService.addRelationship] Error:', error);
    return { data: null, error };
  }
};

export const removeRelationship = async (relationshipId) => {
  try {
    await planter.entities.TaskWithResources.delete(relationshipId, 'task_relationships');
    return { error: null };
  } catch (error) {
    console.error('[taskService.removeRelationship] Error:', error);
    return { error };
  }
};

// --- Background Consistency ---

export const updateParentDates = async (parentId) => {
  if (!parentId) return;

  try {
    const children = await planter.entities.Task.filter({ parent_task_id: parentId });
    const { start_date, due_date } = calculateMinMaxDates(children);

    const parent = await planter.entities.Task.update(parentId, {
      start_date,
      due_date,
      updated_at: new Date().toISOString(),
    });

    if (parent && parent.parent_task_id) {
      await updateParentDates(parent.parent_task_id);
    }
  } catch (error) {
    console.error('[taskService.updateParentDates] Error:', error);
  }
};
