import { supabase } from '../supabaseClient';

const MASTER_LIBRARY_VIEW = 'view_master_library';
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
  { from = 0, limit = DEFAULT_PAGE_SIZE, signal } = {},
  client = supabase
) => {
  const start = coercePositiveInt(from, 0);
  const size = Math.max(1, coercePositiveInt(limit, DEFAULT_PAGE_SIZE));
  const end = Math.max(start, start + size - 1);

  let query = client
    .from(MASTER_LIBRARY_VIEW)
    .select('*')
    .order('created_at', { ascending: false })
    .range(start, end);

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
  { query, limit = DEFAULT_SEARCH_LIMIT, signal } = {},
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
    .or(`title.ilike."${likePattern}",description.ilike."${likePattern}"`)
    .order('updated_at', { ascending: false })
    .limit(size);

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
    throw error;
  }
};

export const fetchTaskChildren = async (taskId, client = supabase) => {
  try {
    // Optimization: Use the 'root_id' column to fetch only the relevant tree.
    // This replaces the previous inefficient method of fetching all tasks by origin.

    // 1. Get the task's root_id to identify the project scope
    const { data: targetTask, error: targetError } = await client
      .from('tasks')
      .select('id, root_id')
      .eq('id', taskId)
      .single();

    if (targetError) throw targetError;

    // If the task has a root_id, use it. If it IS the root, its root_id might be self or null depending on triggers,
    // but the schema guarantees root_id is set. Fallback to taskId if root_id is somehow missing.
    const projectRootId = targetTask.root_id || targetTask.id;

    // 2. Fetch all tasks belonging to this project (same root_id)
    const { data: projectTasks, error: fetchError } = await client
      .from('tasks')
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
    // 1. Fetch the full tree
    const tree = await fetchTaskChildren(templateId, client);

    if (!tree || tree.length === 0) {
      throw new Error('Template not found or empty');
    }

    // 2. Resolve root_id for the deep clone
    // If we have a newParentId, we are inserting into an existing tree, so we need its root_id.
    // If newParentId is null, we are creating a whole new tree (new root).
    let existingRootId = null;

    if (newParentId) {
      // Fetch the root_id of the parent we are attaching to
      // (This assumes the parent already has a root_id set correctly)
      const { data: parentTask, error: parentError } = await client
        .from('tasks')
        .select('root_id')
        .eq('id', newParentId)
        .single();

      if (parentError) {
        // Fallback: If parent not found or error, we abort to preserve integrity
        throw new Error(`Parent task ${newParentId} not found or error fetching root_id`);
      }
      existingRootId = parentTask?.root_id;
    }

    // 3. Prepare new objects
    const { prepareDeepClone } = await import('../utils/treeHelpers');
    const newTasks = prepareDeepClone(
      tree,
      templateId,
      newParentId,
      newOrigin,
      userId,
      existingRootId
    );

    // 4. Insert
    const { data, error } = await client.from('tasks').insert(newTasks).select();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[taskService.deepCloneTask] Error:', error);
    throw error;
  }
};

export const getTasksForUser = async (userId, client = supabase) => {
  try {
    const { data, error } = await client
      .from('tasks')
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
