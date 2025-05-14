// src/utils/dateUtils.js - Updated version with error handling
/**
 * Calculate the due date based on a start date and duration (in days)
 * @param {Date|string} startDate - The start date
 * @param {number} durationDays - The duration in days
 * @returns {Date|null} - The calculated due date or null if inputs are invalid
 */
export const calculateDueDate = (startDate, durationDays) => {
  if (!startDate || durationDays === undefined || durationDays === null) {
    return null;
  }
  
  try {
    const parsedStartDate = typeof startDate === 'string' ? new Date(startDate) : startDate;
    
    if (isNaN(parsedStartDate.getTime()) || isNaN(durationDays)) {
      return null;
    }
    
    const result = new Date(parsedStartDate);
    result.setDate(result.getDate() + parseInt(durationDays, 10));
    return result;
  } catch (err) {
    console.error('Error calculating due date:', err);
    return null;
  }
};

/**
 * Calculate the start date for a task based on parent's start date and offset days
 * @param {Date|string} parentStartDate - The parent task's start date
 * @param {number} daysFromStartUntil - Days after parent start until this task starts
 * @returns {Date|null} - The calculated start date or null if inputs are invalid
 */
export const calculateStartDate = (parentStartDate, daysFromStartUntil) => {
  if (!parentStartDate || daysFromStartUntil === undefined || daysFromStartUntil === null) {
    return null;
  }
  
  try {
    const parsedDate = typeof parentStartDate === 'string' ? new Date(parentStartDate) : parentStartDate;
    
    if (isNaN(parsedDate.getTime()) || isNaN(daysFromStartUntil)) {
      return null;
    }
    
    const result = new Date(parsedDate);
    result.setDate(result.getDate() + parseInt(daysFromStartUntil, 10));
    return result;
  } catch (err) {
    console.error('Error calculating start date:', err);
    return null;
  }
};

/**
 * Format a date for display
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date string or 'No date' if date is invalid
 */
export const formatDate = (date, formatStr = 'MMM d, yyyy') => {
  if (!date) return 'No date';
  
  try {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid date';
    }
    
    // Simple date formatting without external dependencies
    const month = parsedDate.toLocaleString('en-US', { month: 'short' });
    const day = parsedDate.getDate();
    const year = parsedDate.getFullYear();
    
    return `${month} ${day}, ${year}`;
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid date';
  }
};

/**
 * Check if a date range is valid (start date is before or equal to due date)
 * @param {Date|string} startDate - The start date
 * @param {Date|string} dueDate - The due date
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDateRange = (startDate, dueDate) => {
  if (!startDate || !dueDate) return true; // If either date is missing, consider valid
  
  try {
    const parsedStart = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const parsedDue = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    
    if (isNaN(parsedStart.getTime()) || isNaN(parsedDue.getTime())) {
      return false;
    }
    
    return parsedStart <= parsedDue;
  } catch (err) {
    console.error('Error validating date range:', err);
    return false;
  }
};

/**
 * Safely convert date to ISO string
 * @param {Date|string} date - The date to format
 * @returns {string|null} - Formatted ISO string or null if date is invalid
 */
const safeToISOString = (date) => {
  if (!date) return null;
  
  try {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return null;
    return parsedDate.toISOString();
  } catch (err) {
    console.error('Error converting date to ISO string:', err);
    return null;
  }
};

/**
 * Recalculate dates for a task and its children recursively
 * @param {Object} task - The task to update
 * @param {Array} allTasks - All tasks in the system
 * @returns {Object} - Updated task with new dates
 */
export const recalculateTaskDates = (task, allTasks) => {
  // Clone the task to avoid mutating the original
  const updatedTask = { ...task };
  
  try {
    // If this is a child task with a parent, calculate its start date
    if (task.parent_task_id && task.days_from_start_until_due !== undefined) {
      const parentTask = allTasks.find(t => t.id === task.parent_task_id);
      if (parentTask && parentTask.start_date) {
        try {
          const parentStartDate = new Date(parentTask.start_date);
          
          // Check if parentStartDate is valid before proceeding
          if (isNaN(parentStartDate.getTime())) {
            console.warn('Invalid parent start date for task:', task.id);
            return updatedTask;
          }
          
          // Calculate new start date based on parent's start date + days_from_start_until
          const newStartDate = new Date(parentStartDate);
          newStartDate.setDate(newStartDate.getDate() + parseInt(task.days_from_start_until_due || 0, 10));
          
          // Format as ISO string safely
          updatedTask.start_date = safeToISOString(newStartDate);
          
          // If task has a default duration, recalculate due date
          if (updatedTask.start_date && updatedTask.default_duration) {
            const dueDate = calculateDueDate(newStartDate, updatedTask.default_duration);
            if (dueDate) {
              updatedTask.due_date = safeToISOString(dueDate);
            }
          }
        } catch (e) {
          console.error('Error in date calculation for task:', task.id, e);
        }
      }
    }
    
    return updatedTask;
  } catch (err) {
    console.error('Error in recalculateTaskDates:', err);
    return updatedTask; // Return the original clone if there's an error
  }
};

/**
 * Update dates for all tasks when a parent task's dates change
 * @param {string} parentTaskId - ID of the parent task that changed
 * @param {Array} tasks - All tasks in the system
 * @returns {Array} - Updated tasks with recalculated dates
 */
export const updateDependentTaskDates = (parentTaskId, tasks) => {
  try {
    // Check for valid inputs
    if (!parentTaskId || !Array.isArray(tasks) || tasks.length === 0) {
      return tasks;
    }
    
    // Clone all tasks to avoid mutating the originals
    const updatedTasks = [...tasks];
    
    // Find all direct children of this parent
    const childTasks = tasks.filter(t => t.parent_task_id === parentTaskId);
    
    // Skip if there are no children
    if (childTasks.length === 0) {
      return updatedTasks;
    }
    
    // Update each child and its descendants recursively
    const processedTaskIds = new Set();
    
    const updateTaskAndDescendants = (taskId) => {
      if (processedTaskIds.has(taskId)) return; // Prevent circular processing
      
      processedTaskIds.add(taskId);
      
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      // Update this task's dates
      try {
        updatedTasks[taskIndex] = recalculateTaskDates(updatedTasks[taskIndex], updatedTasks);
      } catch (err) {
        console.error('Error updating task dates:', taskId, err);
      }
      
      // Find and update all children of this task
      const children = updatedTasks.filter(t => t.parent_task_id === taskId);
      children.forEach(child => {
        try {
          updateTaskAndDescendants(child.id);
        } catch (err) {
          console.error('Error updating child task:', child.id, err);
        }
      });
    };
    
    // Start the recursive update with each direct child
    childTasks.forEach(child => {
      try {
        updateTaskAndDescendants(child.id);
      } catch (err) {
        console.error('Error processing child task:', child.id, err);
      }
    });
    
    return updatedTasks;
  } catch (err) {
    console.error('Error in updateDependentTaskDates:', err);
    return tasks; // Return original tasks in case of error
  }
};