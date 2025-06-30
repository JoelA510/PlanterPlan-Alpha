import { useState, useCallback } from 'react';
import { updateTaskComplete, updateTaskDateFields } from '../services/taskService';
import { calculateDueDate } from '../utils/dateUtils';
import { 
  updateAncestorDurations,
  getTasksRequiringUpdates,
  updateTasksInDatabase
} from '../utils/sequentialTaskManager';

/**
 * Custom hook for task updates with all the complex business logic
 * Handles template vs instance differences, date propagation, and hierarchy updates
 */
export const useTaskUpdate = () => {
  // Local state for update process
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateProgress, setUpdateProgress] = useState({
    taskId: null,
    step: '',
    isProcessing: false
  });

  /**
   * Update a task with all business logic handled
   * @param {string} taskId - The task ID to update
   * @param {Object} updatedTaskData - The task data to update
   * @param {Object} options - Update options
   * @param {Array} options.existingTasks - Current tasks array for calculations
   * @param {Function} options.onTaskUpdated - Callback when task is updated
   * @param {Function} options.onTasksUpdated - Callback when multiple tasks are updated
   * @param {Function} options.onRefreshNeeded - Callback when full refresh is needed
   * @returns {Promise<{success, data, error}>} - Result of update
   */
  const updateTask = useCallback(async (taskId, updatedTaskData, options = {}) => {
    const { 
      existingTasks = [], 
      onTaskUpdated = null,
      onTasksUpdated = null,
      onRefreshNeeded = null
    } = options;

    try {
      setIsUpdating(true);
      setUpdateError(null);
      setUpdateProgress({
        taskId,
        step: 'Analyzing update...',
        isProcessing: true
      });

      const originalTask = existingTasks.find(t => t.id === taskId);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      // Analyze what kind of update this is
      const updateAnalysis = analyzeTaskUpdate(originalTask, updatedTaskData, existingTasks);
      
      setUpdateProgress({
        taskId,
        step: 'Updating task...',
        isProcessing: true
      });

      // Handle different types of updates
      if (updateAnalysis.isTemplateWithAncestorImpacts) {
        return await handleTemplateAncestorUpdate(taskId, updatedTaskData, updateAnalysis, {
          onRefreshNeeded
        });
      } else if (updateAnalysis.isTemplateUpdate) {
        return await handleTemplateUpdate(taskId, updatedTaskData, updateAnalysis, {
          existingTasks,
          onTasksUpdated
        });
      } else {
        return await handleInstanceUpdate(taskId, updatedTaskData, updateAnalysis, {
          existingTasks,
          onTaskUpdated,
          onTasksUpdated
        });
      }

    } catch (err) {
      console.error('Error updating task:', err);
      const errorMessage = err.message;
      setUpdateError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
      // Reset progress after a delay
      setTimeout(() => {
        setUpdateProgress({
          taskId: null,
          step: '',
          isProcessing: false
        });
      }, 1000);
    }
  }, []);

  /**
   * Update task dates specifically
   * @param {string} taskId - The task ID to update
   * @param {Object} dateData - The date data to update
   * @param {Object} options - Update options
   * @returns {Promise<{success, data, error}>} - Result of update
   */
  const updateTaskDates = useCallback(async (taskId, dateData, options = {}) => {
    const { 
      existingTasks = [], 
      onTaskUpdated = null,
      onDateRecalculationNeeded = null
    } = options;

    try {
      setIsUpdating(true);
      setUpdateError(null);
      setUpdateProgress({
        taskId,
        step: 'Updating dates...',
        isProcessing: true
      });

      console.log('Updating task dates:', taskId, dateData);
      
      const taskToUpdate = existingTasks.find(t => t.id === taskId);
      if (!taskToUpdate) {
        throw new Error('Task not found');
      }
      
      // Enhance date data with calculations
      let enhancedDateData = { ...dateData };
      
      // Calculate due date if needed
      if (dateData.start_date && dateData.duration_days && !dateData.due_date) {
        const calculatedDueDate = calculateDueDate(
          dateData.start_date,
          dateData.duration_days
        );
        
        if (calculatedDueDate) {
          enhancedDateData.due_date = calculatedDueDate.toISOString();
        }
      }
      
      setUpdateProgress({
        taskId,
        step: 'Saving date changes...',
        isProcessing: true
      });
      
      // Update the task in the database
      const result = await updateTaskDateFields(taskId, enhancedDateData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Create updated task object
      const updatedTask = { ...taskToUpdate, ...enhancedDateData };
      
      // Call update callback
      if (onTaskUpdated) {
        await onTaskUpdated(updatedTask);
      }

      // Determine affected tasks for date recalculation
      const affectedTaskIds = getAffectedTasksForDateUpdate(taskId, existingTasks);
      
      // Trigger date recalculation if callback provided
      if (onDateRecalculationNeeded && affectedTaskIds.length > 0) {
        setUpdateProgress({
          taskId,
          step: 'Recalculating related dates...',
          isProcessing: true
        });
        
        await onDateRecalculationNeeded(affectedTaskIds);
      }
      
      console.log('Task dates updated successfully');
      return { success: true, data: updatedTask };
      
    } catch (err) {
      console.error('Error updating task dates:', err);
      const errorMessage = err.message;
      setUpdateError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
      setTimeout(() => {
        setUpdateProgress({
          taskId: null,
          step: '',
          isProcessing: false
        });
      }, 1000);
    }
  }, []);

  /**
   * Analyze what kind of update this is
   */
  const analyzeTaskUpdate = (originalTask, updatedTaskData, existingTasks) => {
    const isTemplate = originalTask.origin === 'template';
    
    // Check if default_duration was changed (for templates)
    const defaultDurationChanged = 
      updatedTaskData.default_duration !== undefined && 
      updatedTaskData.default_duration !== originalTask.default_duration;
    
    // Check for ancestor impacts (when template duration affects parents)
    const hasAncestorImpacts = 
      isTemplate && 
      defaultDurationChanged && 
      updatedTaskData.affectedAncestors && 
      updatedTaskData.affectedAncestors.length > 0;
    
    // Check if task has children
    const hasChildren = existingTasks.some(t => t.parent_task_id === originalTask.id);
    
    // Check what fields are being updated
    const fieldsBeingUpdated = Object.keys(updatedTaskData);
    const isDurationUpdate = fieldsBeingUpdated.includes('duration_days') || fieldsBeingUpdated.includes('default_duration');
    const isHierarchyUpdate = fieldsBeingUpdated.includes('parent_task_id');
    const isDateUpdate = fieldsBeingUpdated.some(field => ['start_date', 'due_date', 'duration_days'].includes(field));
    
    return {
      originalTask,
      isTemplate,
      defaultDurationChanged,
      hasAncestorImpacts,
      hasChildren,
      isDurationUpdate,
      isHierarchyUpdate,
      isDateUpdate,
      isTemplateWithAncestorImpacts: hasAncestorImpacts,
      isTemplateUpdate: isTemplate && !hasAncestorImpacts,
      fieldsBeingUpdated
    };
  };

  /**
   * Handle template updates with ancestor impacts
   */
  const handleTemplateAncestorUpdate = async (taskId, updatedTaskData, analysis, options) => {
    const { onRefreshNeeded } = options;
    
    setUpdateProgress({
      taskId,
      step: 'Updating template with ancestor impacts...',
      isProcessing: true
    });
    
    console.log('Handling ancestor impacts:', updatedTaskData.affectedAncestors);
    
    const ancestorUpdates = updatedTaskData.affectedAncestors.map(ancestor => ({
      id: ancestor.id,
      duration_days: ancestor.newDuration
    }));
    
    const taskUpdateData = { ...updatedTaskData };
    delete taskUpdateData.affectedAncestors;
    
    // Update the main task
    const result = await updateTaskComplete(taskId, taskUpdateData);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update task');
    }
    
    setUpdateProgress({
      taskId,
      step: 'Updating ancestor tasks...',
      isProcessing: true
    });
    
    // Update all ancestor tasks
    for (const update of ancestorUpdates) {
      await updateTaskComplete(update.id, { duration_days: update.duration_days });
    }
    
    // Trigger full refresh since hierarchy changed significantly
    if (onRefreshNeeded) {
      setUpdateProgress({
        taskId,
        step: 'Refreshing data...',
        isProcessing: true
      });
      
      await onRefreshNeeded();
    }
    
    return { success: true, data: result.data };
  };

  /**
   * Handle template-specific updates
   */
  const handleTemplateUpdate = async (taskId, updatedTaskData, analysis, options) => {
    const { existingTasks, onTasksUpdated } = options;
    
    setUpdateProgress({
      taskId: analysis.originalTask.id,
      step: 'Updating template task...',
      isProcessing: true
    });
    
    // Standard update flow
    const result = await updateTaskComplete(taskId, updatedTaskData);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update task');
    }
    
    // Update tasks state
    let updatedTaskList = existingTasks.map(task => 
      task.id === taskId ? { ...task, ...result.data } : task
    );
    
    setUpdateProgress({
      taskId: analysis.originalTask.id,
      step: 'Updating template hierarchy...',
      isProcessing: true
    });
    
    // Handle template hierarchy updates
    if (analysis.hasChildren) {
      updatedTaskList = updateAncestorDurations(taskId, updatedTaskList);
      const tasksToUpdate = getTasksRequiringUpdates(existingTasks, updatedTaskList);
      await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
    }
    
    if (analysis.originalTask.parent_task_id && analysis.defaultDurationChanged) {
      updatedTaskList = updateAncestorDurations(analysis.originalTask.id, updatedTaskList);
      const tasksToUpdate = getTasksRequiringUpdates(existingTasks, updatedTaskList);
      await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
    }
    
    // Update task list
    if (onTasksUpdated) {
      await onTasksUpdated(updatedTaskList);
    }
    
    return { success: true, data: result.data };
  };

  /**
   * Handle instance task updates
   */
  const handleInstanceUpdate = async (taskId, updatedTaskData, analysis, options) => {
    const { existingTasks, onTaskUpdated, onTasksUpdated } = options;
    
    setUpdateProgress({
      taskId: analysis.originalTask.id,
      step: 'Updating instance task...',
      isProcessing: true
    });
    
    // Standard update flow
    const result = await updateTaskComplete(taskId, updatedTaskData);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update task');
    }
    
    // Update tasks state
    const updatedTaskList = existingTasks.map(task => 
      task.id === taskId ? { ...task, ...result.data } : task
    );
    
    // Call appropriate callback
    if (onTasksUpdated) {
      await onTasksUpdated(updatedTaskList);
    } else if (onTaskUpdated) {
      const updatedTask = updatedTaskList.find(t => t.id === taskId);
      await onTaskUpdated(updatedTask);
    }
    
    return { success: true, data: result.data };
  };

  /**
   * Get tasks affected by a date update for recalculation
   */
  const getAffectedTasksForDateUpdate = (taskId, existingTasks) => {
    const affectedTaskIds = [taskId];
    
    // Get descendants
    const getTaskDescendants = (parentId) => {
      const descendants = [];
      const findChildren = (currentParentId) => {
        const children = existingTasks.filter(t => t.parent_task_id === currentParentId);
        children.forEach(child => {
          descendants.push(child.id);
          findChildren(child.id);
        });
      };
      findChildren(parentId);
      return descendants;
    };
    
    // Get siblings
    const getTaskSiblings = (currentTaskId) => {
      const task = existingTasks.find(t => t.id === currentTaskId);
      if (!task) return [];
      
      return existingTasks
        .filter(t => t.parent_task_id === task.parent_task_id && t.id !== currentTaskId)
        .map(t => t.id);
    };
    
    const descendants = getTaskDescendants(taskId);
    const siblings = getTaskSiblings(taskId);
    
    affectedTaskIds.push(...descendants, ...siblings);
    
    return [...new Set(affectedTaskIds)];
  };

  /**
   * Clear any update error state
   */
  const clearUpdateError = useCallback(() => {
    setUpdateError(null);
  }, []);

  /**
   * Reset update progress
   */
  const resetProgress = useCallback(() => {
    setUpdateProgress({
      taskId: null,
      step: '',
      isProcessing: false
    });
  }, []);

  /**
   * Check if we can update (not currently updating)
   */
  const canUpdate = !isUpdating;

  /**
   * Get update status for a specific task
   */
  const getUpdateStatus = useCallback((taskId) => {
    return {
      isUpdating: isUpdating && updateProgress.taskId === taskId,
      currentStep: updateProgress.taskId === taskId ? updateProgress.step : '',
      hasError: updateError !== null
    };
  }, [isUpdating, updateProgress, updateError]);

  return {
    // Main update functions
    updateTask,
    updateTaskDates,
    
    // State
    isUpdating,
    updateError,
    updateProgress,
    canUpdate,
    
    // Helper functions
    getUpdateStatus,
    
    // Actions
    clearUpdateError,
    resetProgress
  };
};