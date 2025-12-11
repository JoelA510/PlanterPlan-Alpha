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
  const normalizedQuery = typeof query === 'string' ? query.trim() : '';

  if (!normalizedQuery) {
    return [];
  }

  const size = Math.max(1, Math.min(50, coercePositiveInt(limit, DEFAULT_SEARCH_LIMIT)));
  const escapedTerm = escapeIlike(normalizedQuery);
  const likePattern = `%${escapedTerm}%`;

  let queryBuilder = client
    .from(MASTER_LIBRARY_VIEW)
    .select('*')
    .or(`title.ilike.${likePattern},description.ilike.${likePattern}`)
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
    // Recursive query would be ideal, but for now we'll fetch all tasks and filter in memory 
    // or use a stored procedure if available. 
    // Given the constraints, let's assume we can fetch by origin/project or just fetch all for now 
    // if the dataset is small, OR we can implement a recursive fetch.
    // BETTER APPROACH: Fetch all tasks that belong to the same tree. 
    // Since we don't have a 'root_id' column on all tasks, we might have to rely on 
    // fetching all tasks for the user/origin and filtering.
    // HOWEVER, for templates, they are public/shared.

    // Let's try to find a way to get descendants. 
    // If we assume a max depth or just fetch all 'template' tasks if origin is template.

    // First, get the task to know its origin.
    const { data: root, error: rootError } = await client
      .from('tasks')
      .select('origin')
      .eq('id', taskId)
      .single();

    if (rootError) throw rootError;

    // If it's a template, we can fetch all templates and filter.
    // If it's an instance, we fetch all instance tasks for that user.
    // This is not efficient for huge DBs but fine for this scale.

    let query = client.from('tasks').select('*');

    if (root.origin === 'template') {
      query = query.eq('origin', 'template');
    } else {
      // For instances, we might need to be more careful, but usually we clone FROM templates.
      query = query.eq('origin', 'instance');
    }

    const { data: allTasks, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    // Now filter for descendants
    const descendants = [];
    const queue = [taskId];
    const visited = new Set([taskId]);

    // Add root to result? Usually we want the whole tree including root.
    const rootTask = allTasks.find(t => t.id === taskId);
    if (rootTask) descendants.push(rootTask);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = allTasks.filter(t => t.parent_task_id === currentId);

      children.forEach(child => {
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

    // 2. Prepare new objects
    const { prepareDeepClone } = await import('../utils/treeHelpers');
    const newTasks = prepareDeepClone(tree, templateId, newParentId, newOrigin, userId);

    // 3. Insert
    const { data, error } = await client.from('tasks').insert(newTasks).select();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[taskService.deepCloneTask] Error:', error);
    throw error;
  }
};
