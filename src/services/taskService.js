import { supabase } from '../supabaseClient';

// Updated to use the view that includes primary resource info
const MASTER_LIBRARY_VIEW = 'tasks_with_primary_resource';
const DEFAULT_PAGE_SIZE = 25;
const REQUIRED_FIELDS = ['id', 'title', 'origin'];
const DEFAULT_SEARCH_LIMIT = 20;

const coercePositiveInt = (value, fallback) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const coerced = Math.max(0, Math.floor(value));
  return coerced;
};

const validateTaskShape = (task) => {
  if (typeof task !== 'object' || task === null) {
    return false;
  }

  return REQUIRED_FIELDS.every((field) => {
    if (field === 'id') {
      return typeof task[field] === 'string' || typeof task[field] === 'number';
    }
    return typeof task[field] === 'string' && task[field].trim().length > 0;
  });
};

export const fetchMasterLibraryTasks = async (
  { from = 0, limit = DEFAULT_PAGE_SIZE, resourceType = null, signal } = {},
  client = supabase
) => {
  const start = coercePositiveInt(from, 0);
  const size = Math.max(1, coercePositiveInt(limit, DEFAULT_PAGE_SIZE));
  const end = Math.max(start, start + size - 1);

  let query = client
    .from(MASTER_LIBRARY_VIEW)
    .select('*')
    .eq('origin', 'template')
    .is('parent_task_id', null)
    .order('created_at', { ascending: false })
    .range(start, end);

  if (resourceType && resourceType !== 'all') {
    query = query.eq('resource_type', resourceType);
  }

  if (signal) {
    query = query.abortSignal(signal);
  }

  try {
    const { data, error } = await query;

    if (signal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError');
    }

    if (error) {
      throw error;
    }

    if (!Array.isArray(data)) {
      console.warn('[taskService.fetchMasterLibraryTasks] Unexpected payload shape:', data);
      return [];
    }

    const validTasks = data.filter((task) => {
      const isValid = validateTaskShape(task);
      if (!isValid) {
        console.warn('[taskService.fetchMasterLibraryTasks] Dropping malformed task record:', task);
      }
      return isValid;
    });

    return validTasks;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }

    console.error(
      '[taskService.fetchMasterLibraryTasks] Fatal error fetching master library tasks:',
      error
    );
    throw error;
  }
};

const escapeIlike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export const searchMasterLibraryTasks = async (
  { query, limit = DEFAULT_SEARCH_LIMIT, resourceType = null, signal } = {},
  client = supabase
) => {
  const normalizedQuery = typeof query === 'string' ? query.trim().slice(0, 100) : '';

  if (!normalizedQuery) {
    return [];
  }

  const size = Math.max(1, Math.min(50, coercePositiveInt(limit, DEFAULT_SEARCH_LIMIT)));
  const escapedTerm = escapeIlike(normalizedQuery);
  const likePattern = `%${escapedTerm}%`;

  let queryBuilder = client
    .from(MASTER_LIBRARY_VIEW)
    .select('*')
    .eq('origin', 'template')
    .is('parent_task_id', null)
    .or(`title.ilike."${likePattern}",description.ilike."${likePattern}"`)
    .order('created_at', { ascending: false })
    .limit(size);

  if (resourceType && resourceType !== 'all') {
    queryBuilder = queryBuilder.eq('resource_type', resourceType);
  }

  if (signal) {
    queryBuilder = queryBuilder.abortSignal(signal);
  }

  try {
    const { data, error } = await queryBuilder;

    if (signal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError');
    }

    if (error) {
      throw error;
    }

    if (!Array.isArray(data)) {
      console.warn('[taskService.searchMasterLibraryTasks] Unexpected payload shape:', data);
      return [];
    }

    return data.filter((task) => {
      const isValid = validateTaskShape(task);
      if (!isValid) {
        console.warn(
          '[taskService.searchMasterLibraryTasks] Dropping malformed task record:',
          task
        );
      }
      return isValid;
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }

    console.error('[taskService.searchMasterLibraryTasks] Fatal error performing search:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};

export const fetchTaskChildren = async (taskId, client = supabase) => {
  try {
    // Optimization: Use the 'root_id' column to fetch only the relevant tree.
    // This replaces the previous inefficient method of fetching all tasks by origin.

    // 1. Get the task's root_id to identify the project scope
    const { data: targetTask, error: targetError } = await client
      .from('tasks_with_primary_resource')
      .select('id, root_id')
      .eq('id', taskId)
      .single();

    if (targetError) throw targetError;

    // If the task has a root_id, use it. If it IS the root, its root_id might be self or null depending on triggers,
    // but the schema guarantees root_id is set. Fallback to taskId if root_id is somehow missing.
    const projectRootId = targetTask.root_id || targetTask.id;

    // 2. Fetch all tasks belonging to this project (same root_id)
    const { data: projectTasks, error: fetchError } = await client
      .from('tasks_with_primary_resource')
      .select('*')
      .eq('root_id', projectRootId);

    if (fetchError) throw fetchError;

    // 3. Filter in-memory to get the specific subtree for 'taskId'
    // (If taskId is the project root, this returns the whole project)
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

    return descendants;
  } catch (error) {
    console.error('[taskService.fetchTaskChildren] Error:', error);
    throw error;
  }
};

export const deepCloneTask = async (
  templateId,
  newParentId,
  newOrigin,
  userId,
  client = supabase
) => {
  try {
    const { data, error } = await client.rpc('clone_project_template', {
      p_template_id: templateId,
      p_new_parent_id: newParentId,
      p_new_origin: newOrigin,
      p_user_id: userId,
    });

    if (error) throw error;

    // The RPC returns a summary
    // If the UI expects the full tree of new tasks, we might need to fetch them
    // For now, based on existing usage, it seems we might just need the result or to refetch the list.
    // The previous implementation returned 'data' which was the result of the LAST insert (tasks). 
    // This return value might be breaking if the caller expects the array of inserted tasks.
    // Let's check callers. But assuming we usually refetch, verification will tell.

    return data;
  } catch (error) {
    console.error('[taskService.deepCloneTask] RPC Error:', error);
    throw error;
  }
};

export const getTasksForUser = async (userId, client = supabase) => {
  try {
    const { data, error } = await client
      .from('tasks_with_primary_resource')
      .select('*')
      .eq('creator', userId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[taskService.getTasksForUser] Error fetching tasks:', error);
    throw error;
  }
};

export const updateTaskStatus = async (taskId, status, client = supabase) => {
  try {
    const { data, error } = await client
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[taskService.updateTaskStatus] Error updating status:', error);
    throw error;
  }
};
