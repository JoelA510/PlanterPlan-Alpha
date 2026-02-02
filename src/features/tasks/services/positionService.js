import { planter } from '@shared/api/planterClient';
import { POSITION_STEP } from '@app/constants/index';
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
 * @param {string} userId - The user ID
 * @returns {Promise<object[]>} Array of updated tasks with new positions
 */
export const renormalizePositions = async (parentId, origin, userId) => {
  // console.debug('Triggering renormalization for parent:', parentId);

  const filters = {
    origin,
    creator: userId,
    parent_task_id: parentId || null
  };

  const tasks = await planter.entities.Task.filter(filters);
  if (!tasks) return [];

  // Sort tasks by position locally since filter doesn't support complex ordering yet
  // or we rely on default order. Better to sort JS side to be safe.
  tasks.sort((a, b) => (a.position || 0) - (b.position || 0));

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

  const { error: updateError } = await planter.entities.Task.upsert(updates);

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

  const { error } = await planter.entities.Task.update(taskId, updates);

  if (error) {
    console.error('Failed to update task position:', error);
    throw error;
  }
};
