import { supabase } from '../supabaseClient';

const POSITION_STEP = 10000;
const MIN_GAP = 2; // Minimum gap before triggering renormalization

/**
 * Calculates a new position between two existing positions.
 * @param {number} prevPos - Position of the item before the insertion point (or 0 if start)
 * @param {number} nextPos - Position of the item after the insertion point (or prevPos + 2*STEP if end)
 * @returns {number|null} The calculated position, or null if renormalization is needed.
 */
export const calculateNewPosition = (prevPos, nextPos) => {
  const previous = Number(prevPos) || 0;
  // If no next item, give plenty of space
  const next =
    nextPos !== undefined && nextPos !== null ? Number(nextPos) : previous + POSITION_STEP * 2;

  // Check for collision or insufficient gap
  if (next - previous < MIN_GAP) {
    return null; // Signal need for renormalization
  }

  return Math.floor((previous + next) / 2);
};

/**
 * Renormalizes positions for a list of tasks to restore proper spacing.
 * @param {string} parentId - The parent task ID (or null for root tasks)
 * @param {string} origin - The task origin ('instance' or 'template')
 * @returns {Promise<void>}
 */
export const renormalizePositions = async (parentId, origin) => {
  console.log('Triggering renormalization for parent:', parentId);

  // 1. Fetch current siblings in current visual order
  // Note: We use existing position for sorting, but we assume the caller
  // might have just failed an optimistic update or we rely on the client's updated list.
  // Actually, simplest strategy: fetch all, sort by position, re-write all.
  // Ideally, the client passes the desired order of IDs to avoid race conditions.
  // But for now, we'll fetch and simply respace them to be safe.

  let query = supabase
    .from('tasks')
    .select('id, position')
    .eq('origin', origin)
    .order('position', { ascending: true });

  if (parentId) {
    query = query.eq('parent_task_id', parentId);
  } else {
    query = query.is('parent_task_id', null);
  }

  const { data: tasks, error } = await query;

  if (error || !tasks) {
    console.error('Error fetching tasks for renormalization:', error);
    return;
  }

  // 2. Prepare batch updates
  // Supabase/PostgREST doesn't support massive bulk updates easily in one query without RPC.
  // We'll use a loop or Promise.all for now, or a better "upsert" approach if we had a constraint key.
  // Ideally, we'd have an RPC `renormalize_tasks(task_ids[])`.
  // For implementation speed and "Constraint: keep DB changes minimal", we do client-side loop.
  // 400 tasks max usually per list, so parallel requests usually fine in batches.

  const updates = tasks.map((task, index) => ({
    id: task.id,
    position: (index + 1) * POSITION_STEP,
  }));

  const { error: upsertError } = await supabase
    .from('tasks')
    .upsert(updates, { onConflict: 'id' }) // requires 'id' primary key which we have
    .select('id, position');

  if (upsertError) {
    console.error('Renormalization failed:', upsertError);
    throw upsertError;
  }
};

/**
 * Updates a single task's position, handling renormalization if necessary.
 * @param {string} taskId - ID of moving task
 * @param {number} newPosition - Calculated optimisitic position
 * @param {string} parentId - New parent ID
 * @param {string} origin - Task origin
 */
export const updateTaskPosition = async (taskId, newPosition, parentId, origin) => {
  const updates = {
    position: newPosition,
    parent_task_id: parentId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);

  if (error) {
    console.error('Failed to update task position:', error);
    throw error;
  }
};
