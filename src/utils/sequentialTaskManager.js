// src/utils/sequentialTaskManager.js

/**
 * Utility for managing sequential tasks
 * Handles task durations, start dates, and parent-child relationships
 */

/**
 * Calculate start dates for children based on sequential position using depth-first traversal
 * @param {string} parentId - The ID of the parent task
 * @param {string|Date} parentStartDate - The parent's start date
 * @param {Array} tasks - Array of all tasks
 * @returns {Array} - Updated tasks array with recalculated dates
 */
export const calculateSequentialStartDates = (parentId, parentStartDate, tasks) => {
  if (!parentId || !parentStartDate || !Array.isArray(tasks) || tasks.length === 0) {
    return tasks;
  }
  
  try {
    // Ensure we have a valid date object for the parent start
    const parentStart = parentStartDate instanceof Date 
      ? new Date(parentStartDate) 
      : new Date(parentStartDate);
    
    if (isNaN(parentStart.getTime())) {
      console.error('Invalid parent start date:', parentStartDate);
      return tasks;
    }
    
    // Get direct children sorted by position
    const children = tasks
      .filter(t => t.parent_task_id === parentId)
      .sort((a, b) => a.position - b.position);
    
    if (children.length === 0) return tasks;
    
    // Clone the tasks array to avoid mutating original
    let updatedTasks = [...tasks];
    
    // Recursive function for depth-first traversal
    const processTaskDepthFirst = (taskId, taskStartDate) => {
      // Find the task in our array
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return taskStartDate; // Return same date if task not found
      
      const task = updatedTasks[taskIndex];
      
      // Update this task's start date
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        start_date: taskStartDate.toISOString()
      };
      
      // Get this task's children
      const taskChildren = updatedTasks
        .filter(t => t.parent_task_id === taskId)
        .sort((a, b) => a.position - b.position);
      
      let currentEndDate;
      
      if (taskChildren.length > 0) {
        // This task has children - process them recursively
        let childStartDate = new Date(taskStartDate);
        let lastChildEndDate = new Date(taskStartDate);
        
        for (const child of taskChildren) {
          // Process this child and all its descendants depth-first
          const childEndDate = processTaskDepthFirst(child.id, childStartDate);
          
          // The next child starts where this child ended
          childStartDate = new Date(childEndDate);
          lastChildEndDate = new Date(childEndDate);
        }
        
        // Parent's due date is the last child's due date
        currentEndDate = lastChildEndDate;
        
        // Update parent's due date to match last child's due date
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          due_date: currentEndDate.toISOString()
        };
        
        // Also update the calculated duration based on actual span
        const durationMs = currentEndDate.getTime() - taskStartDate.getTime();
        const calculatedDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
        
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          duration_days: Math.max(1, calculatedDays) // Ensure at least 1 day
        };
        
      } else {
        // This is a leaf task - calculate its end date from its duration
        const taskDuration = task.duration_days || task.default_duration || 1;
        currentEndDate = new Date(taskStartDate);
        currentEndDate.setDate(currentEndDate.getDate() + taskDuration);
        
        // Set the due date for this leaf task
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          due_date: currentEndDate.toISOString()
        };
      }
      
      // Calculate days from parent start for reference
      if (parentId !== taskId) { // Don't calculate for the root parent
        const daysDiff = Math.round((taskStartDate - parentStart) / (1000 * 60 * 60 * 24));
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          days_from_start_until_due: daysDiff
        };
      }
      
      return currentEndDate;
    };
    
    // Process all direct children sequentially using depth-first traversal
    let currentStartDate = new Date(parentStart);
    
    for (const child of children) {
      // Process this child and all its descendants depth-first
      const childEndDate = processTaskDepthFirst(child.id, currentStartDate);
      
      // Next sibling starts where this child (and all its descendants) ended
      currentStartDate = new Date(childEndDate);
    }
    
    // Update the parent's due date to be the end date of the last child
    if (children.length > 0) {
      const parentIndex = updatedTasks.findIndex(t => t.id === parentId);
      if (parentIndex !== -1) {
        // The parent's due date should be the same as the last processed date
        const lastChild = children[children.length - 1];
        const lastChildIndex = updatedTasks.findIndex(t => t.id === lastChild.id);
        
        if (lastChildIndex !== -1 && updatedTasks[lastChildIndex].due_date) {
          updatedTasks[parentIndex] = {
            ...updatedTasks[parentIndex],
            due_date: updatedTasks[lastChildIndex].due_date
          };
          
          // Also update parent's calculated duration
          const parentStartMs = parentStart.getTime();
          const parentEndMs = new Date(updatedTasks[lastChildIndex].due_date).getTime();
          const parentDurationDays = Math.ceil((parentEndMs - parentStartMs) / (1000 * 60 * 60 * 24));
          
          updatedTasks[parentIndex] = {
            ...updatedTasks[parentIndex],
            duration_days: Math.max(1, parentDurationDays)
          };
        }
      }
    }
    
    return updatedTasks;
  } catch (err) {
    console.error('Error calculating sequential start dates:', err);
    return tasks; // Return original tasks on error
  }
};

/**
 * Calculate parent duration based on sequential children
 * @param {string} parentId - The ID of the parent task
 * @param {Array} tasks - Array of all tasks
 * @returns {number} - The calculated total duration (minimum 1 day)
 */
export const calculateParentDuration = (parentId, tasks) => {
    if (!parentId || !Array.isArray(tasks) || tasks.length === 0) {
      return 1; // Default minimum duration
    }
  
    try {
      // Get direct children of this parent
      const childTasks = tasks.filter(t => t.parent_task_id === parentId);
      
      if (childTasks.length === 0) {
        return 1; // Minimum duration if no children
      }
      
      // Sort children by position to ensure sequential calculation
      const sortedChildren = [...childTasks].sort((a, b) => a.position - b.position);
      
      // Sum the durations of all direct children, but calculate recursively if needed
      const totalDuration = sortedChildren.reduce((sum, child) => {
        // Check if this child has its own children
        const hasChildren = tasks.some(t => t.parent_task_id === child.id);
        
        if (hasChildren) {
          // Recursively calculate this child's duration
          const calculatedDuration = calculateParentDuration(child.id, tasks);
          return sum + calculatedDuration;
        } else {
          // Use the default_duration (stored duration) for leaf tasks if available, 
          // otherwise fall back to duration_days or 1
          const defaultDuration = child.default_duration || child.duration_days || 1;
          return sum + defaultDuration;
        }
      }, 0);
      
      return Math.max(1, totalDuration);
    } catch (err) {
      console.error('Error calculating parent duration:', err);
      return 1; // Fallback to minimum duration on error
    }
  };
  
  /**
   * Calculate start dates for children based on sequential position
   * @param {string} parentId - The ID of the parent task
   * @param {string|Date} parentStartDate - The parent's start date
   * @param {Array} tasks - Array of all tasks
   * @returns {Array} - Updated tasks array with recalculated dates
   */
  // export const calculateSequentialStartDates = (parentId, parentStartDate, tasks) => {
  //   if (!parentId || !parentStartDate || !Array.isArray(tasks) || tasks.length === 0) {
  //     return tasks;
  //   }
    
  //   try {
  //     // Ensure we have a valid date object for the parent start
  //     const parentStart = parentStartDate instanceof Date 
  //       ? new Date(parentStartDate) 
  //       : new Date(parentStartDate);
      
  //     if (isNaN(parentStart.getTime())) {
  //       console.error('Invalid parent start date:', parentStartDate);
  //       return tasks;
  //     }
      
  //     // Get direct children sorted by position
  //     const children = tasks
  //       .filter(t => t.parent_task_id === parentId)
  //       .sort((a, b) => a.position - b.position);
      
  //     if (children.length === 0) return tasks;
      
  //     // Clone the tasks array to avoid mutating original
  //     let updatedTasks = [...tasks];
      
  //     // Start with the parent's start date
  //     let currentStartDate = new Date(parentStart);
      
  //     // Update each child with the correct start date
  //     for (let i = 0; i < children.length; i++) {
  //       const childId = children[i].id;
  //       const childDuration = children[i].duration_days || 1;
        
  //       // Find the child in our array
  //       const childIndex = updatedTasks.findIndex(t => t.id === childId);
  //       if (childIndex === -1) continue;
        
  //       // First child starts with parent, others start after previous sibling ends
  //       if (i === 0) {
  //         // First child starts with parent
  //         updatedTasks[childIndex] = {
  //           ...updatedTasks[childIndex],
  //           start_date: currentStartDate.toISOString(),
  //           days_from_start_until_due: 0
  //         };
  //       } else {
  //         // Calculate days from parent start (for display/reference)
  //         const daysDiff = Math.round((currentStartDate - parentStart) / (1000 * 60 * 60 * 24));
          
  //         updatedTasks[childIndex] = {
  //           ...updatedTasks[childIndex],
  //           start_date: currentStartDate.toISOString(),
  //           days_from_start_until_due: daysDiff
  //         };
  //       }
        
  //       // Calculate the end date for this child
  //       const childEndDate = new Date(currentStartDate);
  //       childEndDate.setDate(childEndDate.getDate() + childDuration);
        
  //       // Set the due date for this child
  //       updatedTasks[childIndex].due_date = childEndDate.toISOString();
        
  //       // Move the current date forward for the next sibling
  //       if (i < children.length - 1) {
  //         currentStartDate = new Date(childEndDate);
  //       }
        
  //       // Recursively calculate for this child's children
  //       if (tasks.some(t => t.parent_task_id === childId)) {
  //         const withGrandchildren = calculateSequentialStartDates(
  //           childId, 
  //           updatedTasks[childIndex].start_date,
  //           updatedTasks
  //         );
  //         // Update our array with the processed grandchildren
  //         updatedTasks = withGrandchildren;
  //       }
  //     }
      
  //     return updatedTasks;
  //   } catch (err) {
  //     console.error('Error calculating sequential start dates:', err);
  //     return tasks; // Return original tasks on error
  //   }
  // };
  
  /**
 * Update the duration of a task and all its ancestors
 * @param {string} taskId - The ID of the task to start updating from
 * @param {Array} tasks - Array of all tasks
 * @returns {Array} - Updated tasks array with new durations
 */
export const updateAncestorDurations = (taskId, tasks) => {
    if (!taskId || !Array.isArray(tasks) || tasks.length === 0) {
      return tasks;
    }
    
    try {
      // Clone the tasks array to avoid mutating the original
      const updatedTasks = [...tasks];
      
      // Get the task
      const task = updatedTasks.find(t => t.id === taskId);
      if (!task) return updatedTasks;
      
      // Get the parent task ID
      const parentId = task.parent_task_id;
      if (!parentId) return updatedTasks; // No parent to update
      
      // Set to track processed parent IDs (prevents infinite loops)
      const processedParentIds = new Set();
      
      // Recursive function to update all ancestors
      const updateParentDuration = (currentParentId) => {
        // Prevent infinite loops with circular references
        if (processedParentIds.has(currentParentId)) return;
        processedParentIds.add(currentParentId);
        
        // Calculate the new duration for this parent
        const newDuration = calculateParentDuration(currentParentId, updatedTasks);
        
        // Find the parent in our updated tasks array
        const parentIndex = updatedTasks.findIndex(t => t.id === currentParentId);
        if (parentIndex === -1) return;
        
        // Only update if the effective duration has changed
        // Note: We're updating duration_days which is the effective duration, 
        // leaving default_duration unchanged
        if (updatedTasks[parentIndex].duration_days !== newDuration) {
          // Update the parent's duration_days
          updatedTasks[parentIndex] = {
            ...updatedTasks[parentIndex],
            duration_days: newDuration
          };
          
          // Note: We don't change the default_duration, which is what the user set
          
          // Get start date of this parent
          const parentStart = updatedTasks[parentIndex].start_date;
          
          // If there's a start date, recalculate dates for all children
          if (parentStart) {
            const withUpdatedDates = calculateSequentialStartDates(
              currentParentId,
              parentStart,
              updatedTasks
            );
            
            // Update our array with the recalculated dates
            for (let i = 0; i < withUpdatedDates.length; i++) {
              updatedTasks[i] = withUpdatedDates[i];
            }
          }
        }
        
        // Check if this parent has a parent (grandparent)
        const grandparentId = updatedTasks[parentIndex].parent_task_id;
        if (grandparentId) {
          // Recursively update the grandparent
          updateParentDuration(grandparentId);
        }
      };
      
      // Start the recursive update process
      updateParentDuration(parentId);
      
      return updatedTasks;
    } catch (err) {
      console.error('Error updating ancestor durations:', err);
      return tasks; // Return original tasks on error
    }
  };
  
  /**
   * Update positions and dates after reordering child tasks
   * @param {string} parentId - The ID of the parent task
   * @param {Array} tasks - Array of all tasks
   * @returns {Array} - Updated tasks array
   */
  export const updateAfterReordering = (parentId, tasks) => {
    if (!parentId || !Array.isArray(tasks) || tasks.length === 0) {
      return tasks;
    }
    
    try {
      // Find the parent task
      const parent = tasks.find(t => t.id === parentId);
      if (!parent) return tasks;
      
      // Get children sorted by position
      const children = tasks
        .filter(t => t.parent_task_id === parentId)
        .sort((a, b) => a.position - b.position);
      
      if (children.length === 0) return tasks;
      
      // Ensure positions are normalized (0, 1, 2, etc.)
      const normalizedTasks = [...tasks];
      
      for (let i = 0; i < children.length; i++) {
        const childId = children[i].id;
        const childIndex = normalizedTasks.findIndex(t => t.id === childId);
        
        if (childIndex !== -1 && normalizedTasks[childIndex].position !== i) {
          normalizedTasks[childIndex] = {
            ...normalizedTasks[childIndex],
            position: i
          };
        }
      }
      
      // If the parent has a start date, recalculate child dates
      if (parent.start_date) {
        const updatedTasks = calculateSequentialStartDates(
          parentId,
          parent.start_date,
          normalizedTasks
        );
        
        return updatedTasks;
      }
      
      return normalizedTasks;
    } catch (err) {
      console.error('Error updating after reordering:', err);
      return tasks;
    }
  };
  
  /**
   * Generate an array of tasks that need database updates after changes
   * @param {Array} originalTasks - Original task array
   * @param {Array} updatedTasks - Updated task array
   * @returns {Array} - Array of tasks that need updates
   */
  export const getTasksRequiringUpdates = (originalTasks, updatedTasks) => {
    if (!Array.isArray(originalTasks) || !Array.isArray(updatedTasks)) {
      return [];
    }
    
    const tasksToUpdate = [];
    
    // Check each updated task against its original
    for (const updatedTask of updatedTasks) {
      const originalTask = originalTasks.find(t => t.id === updatedTask.id);
      
      // Skip if task doesn't exist in both arrays
      if (!originalTask) continue;
      
      // Check if any relevant fields have changed
      if (
        originalTask.duration_days !== updatedTask.duration_days ||
        originalTask.start_date !== updatedTask.start_date ||
        originalTask.due_date !== updatedTask.due_date ||
        originalTask.days_from_start_until_due !== updatedTask.days_from_start_until_due ||
        originalTask.position !== updatedTask.position
      ) {
        // Add only the changed fields to minimize database updates
        const changedFields = {};
        
        if (originalTask.duration_days !== updatedTask.duration_days) {
          changedFields.duration_days = updatedTask.duration_days;
        }
        
        if (originalTask.start_date !== updatedTask.start_date) {
          changedFields.start_date = updatedTask.start_date;
        }
        
        if (originalTask.due_date !== updatedTask.due_date) {
          changedFields.due_date = updatedTask.due_date;
        }
        
        if (originalTask.days_from_start_until_due !== updatedTask.days_from_start_until_due) {
          changedFields.days_from_start_until_due = updatedTask.days_from_start_until_due;
        }
        
        if (originalTask.position !== updatedTask.position) {
          changedFields.position = updatedTask.position;
        }
        
        // Only add if there are actual changes
        if (Object.keys(changedFields).length > 0) {
          tasksToUpdate.push({
            id: updatedTask.id,
            ...changedFields
          });
        }
      }
    }
    
    return tasksToUpdate;
  };
  
  /**
   * Update the database with changes from task reordering or duration updates
   * @param {Array} tasksToUpdate - Array of tasks with changes
   * @param {Function} updateTaskFunc - Function to update task in database
   * @returns {Promise<boolean>} - Success status
   */
  export const updateTasksInDatabase = async (tasksToUpdate, updateTaskFunc) => {
    if (!Array.isArray(tasksToUpdate) || tasksToUpdate.length === 0 || !updateTaskFunc) {
      return false;
    }
    
    try {
      // Process each task update
      for (const task of tasksToUpdate) {
        await updateTaskFunc(task.id, task);
      }
      
      return true;
    } catch (err) {
      console.error('Error updating tasks in database:', err);
      return false;
    }
  };