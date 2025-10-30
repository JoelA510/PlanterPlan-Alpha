import { supabase } from '../supabaseClient';

const MASTER_LIBRARY_VIEW = 'view_master_library';
const DEFAULT_PAGE_SIZE = 25;
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

export const fetchMasterLibraryTasks = async ({ from = 0, limit = DEFAULT_PAGE_SIZE, signal } = {}) => {
  const start = coercePositiveInt(from, 0);
  const size = Math.max(1, coercePositiveInt(limit, DEFAULT_PAGE_SIZE));
  const end = Math.max(start, start + size - 1);

  let query = supabase
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

    console.error('[taskService.fetchMasterLibraryTasks] Fatal error fetching master library tasks:', error);
    throw error;
  }
};
