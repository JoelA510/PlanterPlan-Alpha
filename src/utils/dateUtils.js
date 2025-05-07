// src/utils/dateUtils.js
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
    
    const parsedStartDate = typeof startDate === 'string' ? new Date(startDate) : startDate;
    
    if (isNaN(parsedStartDate.getTime()) || isNaN(durationDays)) {
      return null;
    }
    
    const result = new Date(parsedStartDate);
    result.setDate(result.getDate() + parseInt(durationDays, 10));
    return result;
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
    
    const parsedDate = typeof parentStartDate === 'string' ? new Date(parentStartDate) : parentStartDate;
    
    if (isNaN(parsedDate.getTime()) || isNaN(daysFromStartUntil)) {
      return null;
    }
    
    const result = new Date(parsedDate);
    result.setDate(result.getDate() + parseInt(daysFromStartUntil, 10));
    return result;
  };
  
  /**
   * Format a date for display
   * @param {Date|string} date - The date to format
   * @returns {string} - Formatted date string or 'No date' if date is invalid
   */
  export const formatDate = (date, formatStr = 'MMM d, yyyy') => {
    if (!date) return 'No date';
    
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid date';
    }
    
    // Simple date formatting without external dependencies
    const month = parsedDate.toLocaleString('en-US', { month: 'short' });
    const day = parsedDate.getDate();
    const year = parsedDate.getFullYear();
    
    return `${month} ${day}, ${year}`;
  };
  
  /**
   * Check if a date range is valid (start date is before or equal to due date)
   * @param {Date|string} startDate - The start date
   * @param {Date|string} dueDate - The due date
   * @returns {boolean} - True if valid, false otherwise
   */
  export const isValidDateRange = (startDate, dueDate) => {
    if (!startDate || !dueDate) return true; // If either date is missing, consider valid
    
    const parsedStart = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const parsedDue = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    
    if (isNaN(parsedStart.getTime()) || isNaN(parsedDue.getTime())) {
      return false;
    }
    
    return parsedStart <= parsedDue;
  };

  // Add this to your dateUtils.js file

/**
 * Recalculate dates for a task and its children recursively
 * @param {Object} task - The task to update
 * @param {Array} allTasks - All tasks in the system
 * @returns {Object} - Updated task with new dates
 */
export const recalculateTaskDates = (task, allTasks) => {
    // Clone the task to avoid mutating the original
    const updatedTask = { ...task };
    
    // If this is a child task with a parent, calculate its start date
    if (task.parent_task_id && task.days_from_start_until_due !== undefined) {
      const parentTask = allTasks.find(t => t.id === task.parent_task_id);
      if (parentTask && parentTask.start_date) {
        const parentStartDate = new Date(parentTask.start_date);
        
        // Calculate new start date based on parent's start date + days_from_start_until
        const newStartDate = new Date(parentStartDate);
        newStartDate.setDate(newStartDate.getDate() + parseInt(task.days_from_start_until_due, 10));
        
        // Format as ISO string
        updatedTask.start_date = newStartDate.toISOString();
        
        // If task has a default duration, recalculate due date
        if (updatedTask.start_date && updatedTask.default_duration) {
          const dueDate = new Date(newStartDate);
          dueDate.setDate(dueDate.getDate() + parseInt(updatedTask.default_duration, 10));
          updatedTask.due_date = dueDate.toISOString();
        }
      }
    }
    
    return updatedTask;
  };
  
  /**
   * Update dates for all tasks when a parent task's dates change
   * @param {string} parentTaskId - ID of the parent task that changed
   * @param {Array} tasks - All tasks in the system
   * @returns {Array} - Updated tasks with recalculated dates
   */
  export const updateDependentTaskDates = (parentTaskId, tasks) => {
    // Clone all tasks to avoid mutating the originals
    const updatedTasks = [...tasks];
    
    // Find all direct children of this parent
    const childTasks = tasks.filter(task => task.parent_task_id === parentTaskId);
    
    // Update each child and its descendants recursively
    const processedTaskIds = new Set();
    
    const updateTaskAndDescendants = (taskId) => {
      if (processedTaskIds.has(taskId)) return; // Prevent circular processing
      
      processedTaskIds.add(taskId);
      
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      // Update this task's dates
      updatedTasks[taskIndex] = recalculateTaskDates(updatedTasks[taskIndex], updatedTasks);
      
      // Find and update all children of this task
      const children = updatedTasks.filter(t => t.parent_task_id === taskId);
      children.forEach(child => {
        updateTaskAndDescendants(child.id);
      });
    };
    
    // Start the recursive update with each direct child
    childTasks.forEach(child => {
      updateTaskAndDescendants(child.id);
    });
    
    return updatedTasks;
  };