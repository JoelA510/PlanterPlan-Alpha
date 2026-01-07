import { supabase } from '../supabaseClient';
import { POSITION_STEP } from '../constants';
const MIN_GAP = 2; // Minimum gap before triggering renormalization

/**
 * Calculates a new position between two existing positions.
 * @param {number} prevPos - Position of the item before the insertion point (or 0 if start)
 * @param {number} nextPos - Position of the item after the insertion point (or prevPos + 2*STEP if end)
 * @returns {number|null} The calculated position, or null if renormalization is needed.
 */
export const calculateNewPosition = (prevPos, nextPos) => {
  const previous = Number(prevPos ?? 0);
  const hasNext = nextPos !== undefined && nextPos !== null;
  const next = hasNext ? Number(nextPos) : previous + POSITION_STEP * 2;

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
export const renormalizePositions = async (parentId, origin, userId) => {
  // console.debug('Triggering renormalization for parent:', parentId);

  let query = supabase
    .from('tasks')
    .select('*') // Fetched full objects to allow local state update
    .eq('origin', origin)
    .eq('creator', userId)
    .order('position', { ascending: true });

  if (parentId) {
    query = query.eq('parent_task_id', parentId);
  } else {
    query = query.is('parent_task_id', null);
  }

  const { data: tasks, error } = await query;

  if (error || !tasks) {
    console.error('Error fetching tasks for renormalization:', error);
    return [];
  }

  // 2. Perform updates
  // Refactored to use bulk upsert for atomicity and performance
  // Removed updated_at to prevent schema cache conflicts
  const updatedTasks = tasks.map((task, index) => ({
    ...task, // Keep all original fields
    position: (index + 1) * POSITION_STEP,
  }));

  const updates = updatedTasks.map(({ id, position }) => ({
    id,
    position,
  }));

  const { error: updateError } = await supabase.from('tasks').upsert(updates);

  if (updateError) {
    console.error('Renormalization update failed', updateError);
    throw updateError;
  }

  return updatedTasks;
};

/**
 * Updates a single task's position, handling renormalization if necessary.
 * @param {string} taskId - ID of moving task
 * @param {number} newPosition - Calculated optimisitic position
 * @param {string} parentId - New parent ID
 */
export const updateTaskPosition = async (taskId, newPosition, parentId) => {
  const updates = {
    position: newPosition,
    parent_task_id: parentId,
  };

  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);

  if (error) {
    console.error('Failed to update task position:', error);
    throw error;
  }
};
