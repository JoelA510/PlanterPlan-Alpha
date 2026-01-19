// src/services/taskMasterLibraryService.js
// Master Library specific operations: fetch and search template tasks
import { supabase } from '@app/supabaseClient';

const MASTER_LIBRARY_VIEW = 'tasks_with_primary_resource';
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SEARCH_LIMIT = 20;
const REQUIRED_FIELDS = ['id', 'title', 'origin'];

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

const escapeIlike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * Fetch paginated root-level template tasks from the Master Library.
 */
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
      console.warn(
        '[taskMasterLibraryService.fetchMasterLibraryTasks] Unexpected payload shape:',
        data
      );
      return [];
    }

    const validTasks = data.filter((task) => {
      const isValid = validateTaskShape(task);
      if (!isValid) {
        console.warn(
          '[taskMasterLibraryService.fetchMasterLibraryTasks] Dropping malformed task record:',
          task
        );
      }
      return isValid;
    });

    return { data: validTasks, error: null };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;

    console.error(
      '[taskMasterLibraryService.fetchMasterLibraryTasks] Fatal error fetching master library tasks:',
      error
    );
    return { data: null, error };
  }
};

/**
 * Search template tasks by title/description with optional resource type filter.
 */
/**
 * Search template tasks by title/description with optional resource type filter.
 * 
 * @param {Object} params - Search parameters.
 * @param {string} params.query - The semantic search query string.
 * @param {number} [params.limit=20] - Maximum number of results to return.
 * @param {string|null} [params.resourceType=null] - Resource type filter.
 * @param {AbortSignal} [params.signal] - Abort signal.
 * @param {SupabaseClient} [client=supabase] - Supabase client instance.
 * @returns {Promise<Object>} Object containing { data, error }.
 */
export const searchMasterLibraryTasks = async (
  { query, limit = DEFAULT_SEARCH_LIMIT, resourceType = null, signal } = {},
  client = supabase
) => {
  const normalizedQuery = typeof query === 'string' ? query.trim().slice(0, 100) : '';

  if (!normalizedQuery) {
    return [];
  }

  const size = Math.max(1, coercePositiveInt(limit, DEFAULT_SEARCH_LIMIT));
  const pattern = `"%${escapeIlike(normalizedQuery)}%"`;

  let queryBuilder = client
    .from(MASTER_LIBRARY_VIEW)
    .select('*')
    .eq('origin', 'template')
    .or(`title.ilike.${pattern},description.ilike.${pattern}`)

    .order('title', { ascending: true })
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
      console.warn(
        '[taskMasterLibraryService.searchMasterLibraryTasks] Unexpected payload shape:',
        data
      );
      return [];
    }

    const validTasks = data.filter((task) => {
      const isValid = validateTaskShape(task);
      if (!isValid) {
        console.warn(
          '[taskMasterLibraryService.searchMasterLibraryTasks] Dropping malformed task record:',
          task
        );
      }
      return isValid;
    });

    return { data: validTasks, error: null };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;

    console.error('[taskMasterLibraryService.searchMasterLibraryTasks] Fatal error:', error);
    return { data: null, error };
  }
};
