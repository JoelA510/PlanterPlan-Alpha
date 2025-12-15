import { supabase } from '../supabaseClient';

export const POSITION_STEP = 10000;
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

  // 2. Perform updates
  // We use sequential updates to avoid "upsert" issues with missing NOT NULL columns.
  // Performance note: For typical list sizes (buckets), this is acceptable.

  const updates = tasks.map((task, index) => ({
    id: task.id,
    position: (index + 1) * POSITION_STEP,
  }));

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ position: update.position })
      .eq('id', update.id);

    if (updateError) {
      console.error('Renormalization update failed for task', update.id, updateError);
      // Continue trying others? Or throw? Throwing is safer to alert.
      throw updateError;
    }
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
