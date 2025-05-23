// src/utils/sparsePositioning.js
// Utility functions for managing sparse positioning in task hierarchies

// Constants for sparse positioning
export const POSITION_INCREMENT = 1000; // Base increment between tasks
export const MIN_POSITION_GAP = 10;     // Minimum acceptable gap before renormalization

/**
 * Calculate the appropriate position for inserting a task at a specific index
 * @param {Array} siblings - Array of sibling tasks sorted by position
 * @param {number} newPosition - The index where the new task should be inserted
 * @returns {number} - The calculated position value
 */
export const calculateInsertPosition = (siblings, newPosition) => {
  // If inserting at the beginning
  if (newPosition === 0) {
    const firstTask = siblings[0];
    // Make sure new position will be at least MIN_POSITION_GAP/2 
    if (firstTask) {
      // If first position is already small, use half of it (but never below 1)
      return Math.max(1, Math.floor(firstTask.position / 2));
    }
    return POSITION_INCREMENT; // Default for empty list
  }
  
  // If inserting at the end
  if (newPosition >= siblings.length) {
    const lastTask = siblings[siblings.length - 1];
    return lastTask ? lastTask.position + POSITION_INCREMENT : POSITION_INCREMENT;
  }
  
  // Inserting between tasks - find midpoint
  const beforeTask = siblings[newPosition - 1];
  const afterTask = siblings[newPosition];
  const midpoint = Math.floor((beforeTask.position + afterTask.position) / 2);
  
  // Ensure we're not creating a position that's too small
  return Math.max(beforeTask.position + 1, midpoint);
};

/**
 * Get the next available position at the end of a parent's children
 * @param {Array} tasks - All tasks array
 * @param {string|null} parentId - ID of the parent task (null for top-level)
 * @returns {number} - The next available position
 */
export const getNextAvailablePosition = (tasks, parentId) => {
  const siblings = tasks
    .filter(t => t.parent_task_id === parentId)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  if (siblings.length === 0) {
    return POSITION_INCREMENT;
  }
  
  const lastSibling = siblings[siblings.length - 1];
  return (lastSibling.position || 0) + POSITION_INCREMENT;
};

/**
 * Generate sparse positions for a list of items (useful for creating from templates)
 * @param {number} count - Number of positions to generate
 * @param {number} startingPosition - Starting position (defaults to POSITION_INCREMENT)
 * @returns {Array<number>} - Array of sparse positions
 */
export const generateSparsePositions = (count, startingPosition = POSITION_INCREMENT) => {
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push(startingPosition + (i * POSITION_INCREMENT));
  }
  return positions;
};

/**
 * Check if renormalization is needed for a set of sibling tasks
 * @param {Array} tasks - All tasks array
 * @param {string|null} parentId - ID of the parent task to check
 * @returns {boolean} - True if renormalization is needed
 */
export const checkIfRenormalizationNeeded = (tasks, parentId) => {
  const siblings = tasks
    .filter(t => t.parent_task_id === parentId)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  // Early return if there are no siblings or just one task
  if (siblings.length <= 1) return false;
  
  // Check if first position is too small (this fixes specific issues)
  if (siblings[0].position < MIN_POSITION_GAP) {
    return true; // Renormalization needed when first position gets too small
  }
  
  // Check gaps between adjacent tasks
  for (let i = 0; i < siblings.length - 1; i++) {
    const gap = siblings[i + 1].position - siblings[i].position;
    if (gap < MIN_POSITION_GAP) {
      return true; // Renormalization needed
    }
  }
  
  return false; // Spacing is fine
};

/**
 * Generate normalized positions for a set of sibling tasks
 * @param {Array} siblings - Array of sibling tasks to normalize
 * @param {number} startPosition - Starting position (defaults to POSITION_INCREMENT)
 * @returns {Array} - Array of objects with id and new position
 */
export const generateNormalizedPositions = (siblings, startPosition = POSITION_INCREMENT) => {
  // Sort siblings by current position to maintain order
  const sortedSiblings = [...siblings].sort((a, b) => (a.position || 0) - (b.position || 0));
  
  // Generate new positions with large gaps
  return sortedSiblings.map((task, index) => ({
    id: task.id,
    position: startPosition + (index * POSITION_INCREMENT)
  }));
};

/**
 * Insert a task at a specific position among siblings using sparse positioning
 * @param {Array} tasks - All tasks array
 * @param {string|null} parentId - ID of the parent task
 * @param {number} insertIndex - Index where to insert the new task
 * @returns {number} - The calculated position for the new task
 */
export const calculatePositionForInsert = (tasks, parentId, insertIndex) => {
  const siblings = tasks
    .filter(t => t.parent_task_id === parentId)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  return calculateInsertPosition(siblings, insertIndex);
};

/**
 * Move a task to a new position among siblings
 * @param {Array} tasks - All tasks array
 * @param {string} taskId - ID of the task to move
 * @param {string|null} newParentId - New parent ID
 * @param {number} newIndex - New index position
 * @returns {Object} - Object with the new position and whether renormalization is needed
 */
export const calculateMovePosition = (tasks, taskId, newParentId, newIndex) => {
  // Get siblings at the new parent level (excluding the task being moved)
  const siblings = tasks
    .filter(t => t.parent_task_id === newParentId && t.id !== taskId)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  const newPosition = calculateInsertPosition(siblings, newIndex);
  const needsRenormalization = checkIfRenormalizationNeeded(
    [...tasks.filter(t => t.id !== taskId), { id: taskId, parent_task_id: newParentId, position: newPosition }],
    newParentId
  );
  
  return {
    position: newPosition,
    needsRenormalization
  };
};

/**
 * Utility function to get all positions for a parent's children
 * @param {Array} tasks - All tasks array
 * @param {string|null} parentId - ID of the parent task
 * @returns {Array<number>} - Array of positions sorted
 */
export const getChildPositions = (tasks, parentId) => {
  return tasks
    .filter(t => t.parent_task_id === parentId)
    .map(t => t.position || 0)
    .sort((a, b) => a - b);
};

/**
 * Debug function to log positioning information
 * @param {Array} tasks - All tasks array
 * @param {string|null} parentId - ID of the parent task to analyze
 * @param {string} context - Context string for debugging
 */
export const debugPositions = (tasks, parentId, context = '') => {
  const siblings = tasks
    .filter(t => t.parent_task_id === parentId)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  console.log(`${context} - Positions for parent ${parentId}:`, 
    siblings.map(t => ({ id: t.id, title: t.title, position: t.position }))
  );
  
  if (siblings.length > 1) {
    const gaps = [];
    for (let i = 0; i < siblings.length - 1; i++) {
      gaps.push(siblings[i + 1].position - siblings[i].position);
    }
    console.log(`${context} - Gaps:`, gaps);
    console.log(`${context} - Needs renormalization:`, checkIfRenormalizationNeeded(tasks, parentId));
  }
};