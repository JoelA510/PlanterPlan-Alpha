// src/utils/sparsePositioning.js
// Utility functions for managing sparse positioning in task hierarchies
// ✅ UPDATED: Now compatible with HTML5 drag & drop events

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
 * ✅ NEW: HTML5 drag & drop specific helpers
 * Calculate position for HTML5 drop events
 */

/**
 * Extract drop position information from HTML5 drag event
 * @param {DragEvent} event - HTML5 drag event
 * @param {Array} tasks - All tasks array
 * @returns {Object|null} - Drop position info or null if invalid
 */
export const extractDropPositionFromEvent = (event, tasks) => {
  try {
    const draggedId = event.dataTransfer.getData('text/plain');
    const targetElement = event.target.closest('[data-task-id], [data-drop-type]');
    
    if (!targetElement) return null;
    
    // Check if dropping on a drop zone
    const dropType = targetElement.getAttribute('data-drop-type');
    if (dropType) {
      return {
        type: dropType,
        parentId: targetElement.getAttribute('data-parent-id'),
        position: parseInt(targetElement.getAttribute('data-position'), 10),
        level: parseInt(targetElement.getAttribute('data-level'), 10) || 0,
        draggedId
      };
    }
    
    // Dropping on a task
    const targetTaskId = targetElement.getAttribute('data-task-id');
    if (targetTaskId) {
      return {
        type: 'onto',
        targetTaskId,
        draggedId
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to extract drop position from event:', error);
    return null;
  }
};

/**
 * Move a task to a new position among siblings
 * ✅ UPDATED: Now works with HTML5 events instead of @dnd-kit
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
 * ✅ NEW: Calculate position for different HTML5 drop scenarios
 * @param {Object} dropInfo - Drop information from extractDropPositionFromEvent
 * @param {Array} tasks - All tasks array
 * @returns {Object} - Position calculation result
 */
export const calculateHTML5DropPosition = (dropInfo, tasks) => {
  if (!dropInfo || !dropInfo.draggedId) {
    return { success: false, reason: 'invalid_drop_info' };
  }
  
  const draggedTask = tasks.find(t => t.id === dropInfo.draggedId);
  if (!draggedTask) {
    return { success: false, reason: 'dragged_task_not_found' };
  }
  
  switch (dropInfo.type) {
    case 'between':
      // Dropping between tasks (reordering within same parent)
      const newParentId = dropInfo.parentId;
      const newPosition = dropInfo.position;
      
      const siblings = tasks
        .filter(t => t.parent_task_id === newParentId && t.id !== dropInfo.draggedId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      const calculatedPosition = calculateInsertPosition(siblings, newPosition);
      
      return {
        success: true,
        type: 'reorder',
        newParentId,
        newPosition: calculatedPosition,
        oldParentId: draggedTask.parent_task_id,
        needsRenormalization: checkIfRenormalizationNeeded(
          [...tasks.filter(t => t.id !== dropInfo.draggedId), 
           { ...draggedTask, parent_task_id: newParentId, position: calculatedPosition }],
          newParentId
        )
      };
      
    case 'into':
      // Dropping into a task (making it a child)
      const parentTaskId = dropInfo.parentId;
      const existingChildren = tasks.filter(t => t.parent_task_id === parentTaskId);
      const childPosition = existingChildren.length > 0 ? 
        Math.max(...existingChildren.map(t => t.position || 0)) + POSITION_INCREMENT : 
        POSITION_INCREMENT;
      
      return {
        success: true,
        type: 'nest',
        newParentId: parentTaskId,
        newPosition: childPosition,
        oldParentId: draggedTask.parent_task_id,
        needsRenormalization: false // New child shouldn't need renormalization
      };
      
    case 'onto':
      // Dropping onto another task
      const targetTask = tasks.find(t => t.id === dropInfo.targetTaskId);
      if (!targetTask) {
        return { success: false, reason: 'target_task_not_found' };
      }
      
      if (targetTask.parent_task_id === draggedTask.parent_task_id) {
        // Same parent - reorder
        const sameLevelSiblings = tasks
          .filter(t => t.parent_task_id === targetTask.parent_task_id && t.id !== dropInfo.draggedId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        
        const targetIndex = sameLevelSiblings.findIndex(t => t.id === targetTask.id);
        
        // Determine insert position based on drag direction
        const draggedIndex = tasks.findIndex(t => t.id === dropInfo.draggedId);
        const targetTaskIndex = tasks.findIndex(t => t.id === dropInfo.targetTaskId);
        const insertIndex = draggedIndex < targetTaskIndex ? targetIndex + 1 : targetIndex;
        
        const reorderPosition = calculateInsertPosition(sameLevelSiblings, insertIndex);
        
        return {
          success: true,
          type: 'reorder',
          newParentId: targetTask.parent_task_id,
          newPosition: reorderPosition,
          oldParentId: draggedTask.parent_task_id,
          needsRenormalization: checkIfRenormalizationNeeded(
            [...tasks.filter(t => t.id !== dropInfo.draggedId), 
             { ...draggedTask, parent_task_id: targetTask.parent_task_id, position: reorderPosition }],
            targetTask.parent_task_id
          )
        };
      } else {
        // Different parent - move to target's parent
        return {
          success: true,
          type: 'move',
          newParentId: targetTask.parent_task_id,
          newPosition: targetTask.position + 500, // Insert after target
          oldParentId: draggedTask.parent_task_id,
          needsRenormalization: false
        };
      }
      
    default:
      return { success: false, reason: 'unknown_drop_type' };
  }
};

/**
 * ✅ NEW: Helper to integrate with HTML5 dataTransfer
 * @param {string} taskId - ID of task being dragged
 * @param {Object} additionalData - Additional data to store
 * @returns {Object} - Data to set in dataTransfer
 */
export const createHTML5DragData = (taskId, additionalData = {}) => {
  return {
    'text/plain': taskId,
    'application/json': JSON.stringify({
      taskId,
      timestamp: Date.now(),
      ...additionalData
    })
  };
};

/**
 * ✅ NEW: Extract all drag data from HTML5 dataTransfer
 * @param {DataTransfer} dataTransfer - HTML5 DataTransfer object
 * @returns {Object} - Extracted drag data
 */
export const extractHTML5DragData = (dataTransfer) => {
  try {
    const taskId = dataTransfer.getData('text/plain');
    let additionalData = {};
    
    try {
      const jsonData = dataTransfer.getData('application/json');
      if (jsonData) {
        additionalData = JSON.parse(jsonData);
      }
    } catch (error) {
      // JSON data is optional, so continue without it
    }
    
    return {
      taskId,
      ...additionalData
    };
  } catch (error) {
    console.warn('Failed to extract HTML5 drag data:', error);
    return { taskId: null };
  }
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
 * ✅ ENHANCED: Debug function with HTML5 event info
 * @param {Array} tasks - All tasks array
 * @param {string|null} parentId - ID of the parent task to analyze
 * @param {string} context - Context string for debugging
 * @param {Object} eventInfo - Optional HTML5 event information
 */
export const debugPositions = (tasks, parentId, context = '', eventInfo = null) => {
  const siblings = tasks
    .filter(t => t.parent_task_id === parentId)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  console.log(`🔍 Position Debug ${context}:`);
  console.log('- Parent ID:', parentId);
  console.log('- Sibling count:', siblings.length);
  console.log('- Positions:', siblings.map(t => ({ id: t.id, title: t.title, position: t.position })));
  
  if (siblings.length > 1) {
    const gaps = [];
    for (let i = 0; i < siblings.length - 1; i++) {
      gaps.push(siblings[i + 1].position - siblings[i].position);
    }
    console.log('- Gaps between siblings:', gaps);
    console.log('- Needs renormalization:', checkIfRenormalizationNeeded(tasks, parentId));
  }
  
  if (eventInfo) {
    console.log('- HTML5 Event Info:', eventInfo);
  }
};

/**
 * ✅ NEW: Validate position integrity for a task hierarchy
 * @param {Array} tasks - All tasks array
 * @returns {Object} - Validation result with any issues found
 */
export const validatePositionIntegrity = (tasks) => {
  const issues = [];
  const parentGroups = new Map();
  
  // Group tasks by parent
  tasks.forEach(task => {
    const parentId = task.parent_task_id || 'root';
    if (!parentGroups.has(parentId)) {
      parentGroups.set(parentId, []);
    }
    parentGroups.get(parentId).push(task);
  });
  
  // Check each parent group
  parentGroups.forEach((siblings, parentId) => {
    const sortedSiblings = siblings.sort((a, b) => (a.position || 0) - (b.position || 0));
    
    // Check for duplicate positions
    const positions = sortedSiblings.map(t => t.position || 0);
    const uniquePositions = [...new Set(positions)];
    if (positions.length !== uniquePositions.length) {
      issues.push({
        type: 'duplicate_positions',
        parentId,
        positions: positions.filter((pos, index) => positions.indexOf(pos) !== index)
      });
    }
    
    // Check for positions that are too close
    for (let i = 0; i < sortedSiblings.length - 1; i++) {
      const gap = sortedSiblings[i + 1].position - sortedSiblings[i].position;
      if (gap < MIN_POSITION_GAP) {
        issues.push({
          type: 'positions_too_close',
          parentId,
          taskIds: [sortedSiblings[i].id, sortedSiblings[i + 1].id],
          gap
        });
      }
    }
    
    // Check for zero or negative positions
    const invalidPositions = sortedSiblings.filter(t => (t.position || 0) <= 0);
    if (invalidPositions.length > 0) {
      issues.push({
        type: 'invalid_positions',
        parentId,
        taskIds: invalidPositions.map(t => t.id)
      });
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations: issues.length > 0 ? ['Run position renormalization'] : []
  };
};