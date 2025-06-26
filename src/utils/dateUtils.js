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
 * Calculate the end date for a task based on start date and duration
 * @param {Date|string} startDate - The start date
 * @param {number} durationDays - The duration in days
 * @returns {Date|null} - The calculated end date or null if inputs are invalid
 */
export const calculateTaskEndDate = (startDate, durationDays) => {
  // This is essentially the same as calculateDueDate, but with a clearer name
  return calculateDueDate(startDate, durationDays);
};

/**
 * Determines the appropriate start date for a task based on its position
 * @param {Object} task - The task to determine start date for
 * @param {Array} allTasks - All tasks in the system
 * @returns {Date|null} - The calculated start date or null if cannot be determined
 */
export const determineTaskStartDate = (task, allTasks) => {
  try {
    if (!task || !Array.isArray(allTasks)) {
      return null;
    }
    
    // If it's a top-level task with no parent, return its existing start date or null
    if (!task.parent_task_id) {
      return task.start_date ? new Date(task.start_date) : null;
    }
    
    // Find the parent task
    const parentTask = allTasks.find(t => t.id === task.parent_task_id);
    if (!parentTask || !parentTask.start_date) {
      return null; // Can't calculate without parent's start date
    }
    
    // Get all siblings of this task (excluding itself)
    const siblings = allTasks
      .filter(t => t.parent_task_id === task.parent_task_id && t.id !== task.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    // If this is the first child (position 0), use parent's start date
    if (task.position === 0 || siblings.length === 0) {
      return new Date(parentTask.start_date);
    }
    
    // Find the previous sibling based on position
    const taskPosition = task.position || 0;
    const previousSiblings = siblings.filter(s => (s.position || 0) < taskPosition);
    
    if (previousSiblings.length === 0) {
      // If no previous siblings found but position > 0, something's wrong
      // Fall back to parent's start date
      return new Date(parentTask.start_date);
    }
    
    // Get the immediately previous sibling (highest position less than current task)
    const previousSibling = previousSiblings.reduce((prev, current) => 
      (current.position > prev.position) ? current : prev
    );
    
    // Use the due date of the previous task as this task's start date
    if (previousSibling.due_date) {
      return new Date(previousSibling.due_date);
    }
    
    // If previous sibling has no due date but has start date and duration, calculate it
    if (previousSibling.start_date && previousSibling.duration_days) {
      const prevStartDate = new Date(previousSibling.start_date);
      const result = new Date(prevStartDate);
      result.setDate(result.getDate() + parseInt(previousSibling.duration_days, 10));
      return result;
    }
    
    // Fall back to parent's start date if we can't determine from siblings
    return new Date(parentTask.start_date);
  } catch (err) {
    console.error('Error determining task start date:', err);
    return null;
  }
};

/**
 * Calculate sequential start dates for a project hierarchy
 * @param {string} rootTaskId - Root task ID
 * @param {Date} projectStartDate - Project start date
 * @param {Array} tasks - All tasks in the hierarchy
 * @returns {Array} - Tasks with calculated sequential dates
 */
export const calculateSequentialStartDates = (rootTaskId, projectStartDate, tasks) => {
  try {
    if (!rootTaskId || !projectStartDate || !Array.isArray(tasks)) {
      console.error('Invalid parameters for calculateSequentialStartDates');
      return tasks;
    }

    // Create a copy of tasks to avoid mutating the original
    const updatedTasks = tasks.map(task => ({ ...task }));
    
    // Build parent-child relationship map
    const childrenByParent = {};
    updatedTasks.forEach(task => {
      if (task.parent_task_id) {
        if (!childrenByParent[task.parent_task_id]) {
          childrenByParent[task.parent_task_id] = [];
        }
        childrenByParent[task.parent_task_id].push(task);
      }
    });

    // Sort children by position for each parent
    Object.keys(childrenByParent).forEach(parentId => {
      childrenByParent[parentId].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    // Recursive function to process tasks level by level
    const processTaskAndChildren = (taskId, taskStartDate) => {
      const task = updatedTasks.find(t => t.id === taskId);
      if (!task) return;

      // Set the task's start date
      task.start_date = safeToISOString(taskStartDate);
      
      // Calculate and set the task's due date
      const taskDuration = task.duration_days || task.default_duration || 1;
      const taskEndDate = calculateDueDate(taskStartDate, taskDuration);
      if (taskEndDate) {
        task.due_date = safeToISOString(taskEndDate);
      }

      // Process children sequentially
      const children = childrenByParent[taskId] || [];
      let currentDate = new Date(taskStartDate);

      children.forEach(child => {
        // Process this child and its descendants
        processTaskAndChildren(child.id, currentDate);
        
        // Move current date to after this child's completion
        const childDuration = child.duration_days || child.default_duration || 1;
        currentDate = calculateDueDate(currentDate, childDuration) || currentDate;
      });

      // Update parent's due date to match the last child's due date
      if (children.length > 0) {
        const lastChild = children[children.length - 1];
        if (lastChild.due_date) {
          task.due_date = lastChild.due_date;
          
          // Update duration to match the time span
          const startDate = new Date(task.start_date);
          const endDate = new Date(lastChild.due_date);
          const durationMs = endDate.getTime() - startDate.getTime();
          const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
          task.duration_days = Math.max(1, durationDays);
        }
      }
    };

    // Start processing from the root task
    processTaskAndChildren(rootTaskId, projectStartDate);

    return updatedTasks;
  } catch (err) {
    console.error('Error in calculateSequentialStartDates:', err);
    return tasks;
  }
};

/**
 * Calculate sequential dates for an entire task hierarchy
 * @param {Array} tasks - All tasks in the hierarchy
 * @param {Date} rootStartDate - Start date for the root task
 * @returns {Array} - Tasks with updated sequential dates
 */
export const calculateSequentialDatesForHierarchy = (tasks, rootStartDate) => {
  try {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return tasks;
    }

    // Find the root task (task with no parent)
    const rootTask = tasks.find(t => !t.parent_task_id);
    if (!rootTask) {
      console.warn('No root task found in hierarchy');
      return tasks;
    }

    // Use the existing calculateSequentialStartDates function
    return calculateSequentialStartDates(rootTask.id, rootStartDate, tasks);
  } catch (err) {
    console.error('Error in calculateSequentialDatesForHierarchy:', err);
    return tasks;
  }
};

/**
 * Update dates for all tasks in a hierarchy after a change
 * @param {string} rootTaskId - Root task ID of the hierarchy
 * @param {Date} newStartDate - New start date for the hierarchy
 * @param {Array} tasks - All tasks in the hierarchy
 * @returns {Array} - Tasks with updated dates
 */
export const updateTaskDatesInHierarchy = (rootTaskId, newStartDate, tasks) => {
  try {
    if (!rootTaskId || !newStartDate || !Array.isArray(tasks)) {
      console.error('Invalid parameters for updateTaskDatesInHierarchy');
      return tasks;
    }

    // Find the root task and ensure it has the correct start date
    const updatedTasks = tasks.map(task => {
      if (task.id === rootTaskId) {
        return {
          ...task,
          start_date: safeToISOString(newStartDate)
        };
      }
      return { ...task };
    });

    // Use calculateSequentialStartDates to recalculate all dates
    return calculateSequentialStartDates(rootTaskId, newStartDate, updatedTasks);
  } catch (err) {
    console.error('Error in updateTaskDatesInHierarchy:', err);
    return tasks;
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
          if (updatedTask.start_date && updatedTask.duration_days) {
            const dueDate = calculateDueDate(newStartDate, updatedTask.duration_days);
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