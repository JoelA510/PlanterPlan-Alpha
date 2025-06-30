import { useState, useCallback } from 'react';
import { deleteTask } from '../services/taskService';
import { 
  calculateParentDuration, 
  updateAncestorDurations,
  updateAfterReordering,
  getTasksRequiringUpdates,
  updateTasksInDatabase
} from '../utils/sequentialTaskManager';
import { updateTaskComplete } from '../services/taskService';

/**
 * Custom hook for task deletion with all the complex cascade logic
 * Handles deletion, hierarchy updates, template duration recalculation, and error states
 */
export const useTaskDeletion = () => {
  // Local state for deletion process
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState(null);
  const [deletionProgress, setDeletionProgress] = useState({
    taskId: null,
    step: '',
    isProcessing: false
  });

  /**
   * Delete a task with all cascade logic and error handling
   * @param {string} taskId - The task ID to delete
   * @param {Object} options - Deletion options
   * @param {boolean} options.deleteChildren - Whether to delete children (default: true)
   * @param {Array} options.existingTasks - Current tasks array for calculations
   * @param {Function} options.onTasksDeleted - Callback when tasks are deleted
   * @param {Function} options.onTasksUpdated - Callback when task list is updated
   * @returns {Promise<{success, deletedIds, hasChildren, error}>} - Result of deletion
   */
  const deleteTask = useCallback(async (taskId, options = {}) => {
    const { 
      deleteChildren = true, 
      existingTasks = [], 
      onTasksDeleted = null,
      onTasksUpdated = null
    } = options;

    try {
      setIsDeleting(true);
      setDeletionError(null);
      setDeletionProgress({
        taskId,
        step: 'Preparing deletion...',
        isProcessing: true
      });

      console.log(`Deleting task ${taskId} (with children: ${deleteChildren})`);
      
      const taskToDelete = existingTasks.find(t => t.id === taskId);
      if (!taskToDelete) {
        throw new Error('Task not found');
      }

      // Analyze what will be affected by deletion
      const deletionAnalysis = analyzeTaskDeletion(taskId, existingTasks, deleteChildren);
      
      setDeletionProgress({
        taskId,
        step: `Deleting ${deletionAnalysis.totalTasksToDelete} task(s)...`,
        isProcessing: true
      });

      // Perform the actual deletion
      const result = await performTaskDeletion(taskId, deleteChildren);
      
      if (!result.success) {
        // Handle date calculation errors gracefully
        if (result.error && (
          result.error.includes("Invalid time value") || 
          result.error.includes("Invalid date")
        )) {
          console.warn("Date calculation issue during deletion, continuing with UI update");
          
          setDeletionProgress({
            taskId,
            step: 'Handling date calculation issues...',
            isProcessing: true
          });
          
          // Fallback: calculate what should be deleted and update UI
          const fallbackResult = await handleDeletionFallback(
            taskId, 
            deleteChildren, 
            existingTasks, 
            deletionAnalysis,
            onTasksUpdated
          );
          
          return fallbackResult;
        }
        
        throw new Error(result.error);
      }

      setDeletionProgress({
        taskId,
        step: 'Updating related tasks...',
        isProcessing: true
      });

      // Handle post-deletion updates
      const postDeletionResult = await handlePostDeletionUpdates(
        result,
        deletionAnalysis,
        existingTasks,
        onTasksUpdated
      );

      // Call success callback if provided
      if (onTasksDeleted && result.deletedIds) {
        await onTasksDeleted(result.deletedIds, deletionAnalysis.hasChildren);
      }

      console.log(`Successfully deleted ${result.deletedIds?.length || 1} tasks`);

      return {
        success: true,
        deletedIds: result.deletedIds || [taskId],
        hasChildren: deletionAnalysis.hasChildren,
        error: null
      };

    } catch (err) {
      console.error('Error deleting task:', err);
      
      // Handle date calculation errors specially
      if (err.message && (
        err.message.includes("Invalid time value") || 
        err.message.includes("Invalid date")
      )) {
        const errorMessage = "Date calculation error during deletion. Try refreshing the page.";
        setDeletionError(errorMessage);
        return { 
          success: false, 
          error: errorMessage,
          deletedIds: null,
          hasChildren: false
        };
      }
      
      const errorMessage = err.message;
      setDeletionError(errorMessage);
      return { 
        success: false, 
        error: errorMessage,
        deletedIds: null,
        hasChildren: false
      };
    } finally {
      setIsDeleting(false);
      // Reset progress after a delay so user can see completion
      setTimeout(() => {
        setDeletionProgress({
          taskId: null,
          step: '',
          isProcessing: false
        });
      }, 1000);
    }
  }, []);

  /**
   * Analyze what will be affected by the deletion
   */
  const analyzeTaskDeletion = (taskId, existingTasks, deleteChildren) => {
    const taskToDelete = existingTasks.find(t => t.id === taskId);
    const siblings = existingTasks
      .filter(t => t.parent_task_id === taskToDelete.parent_task_id && t.id !== taskId)
      .map(t => t.id);
    
    let childTaskIds = [];
    if (deleteChildren) {
      const findAllChildren = (parentId) => {
        const children = existingTasks.filter(t => t.parent_task_id === parentId).map(t => t.id);
        childTaskIds.push(...children);
        children.forEach(childId => findAllChildren(childId));
      };
      findAllChildren(taskId);
    }

    const allTaskIdsToDelete = [taskId, ...childTaskIds];
    
    return {
      taskToDelete,
      siblings,
      childTaskIds,
      allTaskIdsToDelete,
      totalTasksToDelete: allTaskIdsToDelete.length,
      hasChildren: childTaskIds.length > 0,
      parentId: taskToDelete.parent_task_id,
      isTemplate: taskToDelete.origin === 'template'
    };
  };

  /**
   * Perform the actual deletion API call
   */
  const performTaskDeletion = async (taskId, deleteChildren) => {
    return await deleteTask(taskId, deleteChildren);
  };

  /**
   * Handle deletion fallback when API has date calculation issues
   */
  const handleDeletionFallback = async (taskId, deleteChildren, existingTasks, analysis, onTasksUpdated) => {
    const { allTaskIdsToDelete, childTaskIds, parentId, isTemplate } = analysis;
    
    // Filter out deleted tasks from the UI
    const updatedTaskList = existingTasks.filter(task => !allTaskIdsToDelete.includes(task.id));
    
    if (isTemplate && parentId) {
      const reorderedTasks = updateAfterReordering(parentId, updatedTaskList);
      const parent = reorderedTasks.find(t => t.id === parentId);
      
      if (parent) {
        const newDuration = calculateParentDuration(parentId, reorderedTasks);
        if (parent.duration_days !== newDuration) {
          const tasksWithUpdatedDurations = updateAncestorDurations(parentId, reorderedTasks);
          const tasksToUpdate = getTasksRequiringUpdates(updatedTaskList, tasksWithUpdatedDurations);
          
          try {
            await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
            if (onTasksUpdated) await onTasksUpdated(tasksWithUpdatedDurations);
          } catch (updateErr) {
            console.warn('Error updating ancestor durations during fallback:', updateErr);
            if (onTasksUpdated) await onTasksUpdated(reorderedTasks);
          }
          
          return { 
            success: true, 
            deletedIds: allTaskIdsToDelete,
            hasChildren: childTaskIds.length > 0
          };
        }
      }
      
      if (onTasksUpdated) await onTasksUpdated(reorderedTasks);
    } else {
      if (onTasksUpdated) await onTasksUpdated(updatedTaskList);
    }
    
    return { 
      success: true, 
      deletedIds: allTaskIdsToDelete,
      hasChildren: childTaskIds.length > 0
    };
  };

  /**
   * Handle post-deletion updates (hierarchy, durations, etc.)
   */
  const handlePostDeletionUpdates = async (deletionResult, analysis, existingTasks, onTasksUpdated) => {
    if (!deletionResult.deletedIds || !Array.isArray(deletionResult.deletedIds)) {
      return deletionResult;
    }

    const { parentId, isTemplate } = analysis;
    const updatedTaskList = existingTasks.filter(task => !deletionResult.deletedIds.includes(task.id));
    
    if (isTemplate && parentId) {
      // Handle template-specific updates
      const reorderedTasks = updateAfterReordering(parentId, updatedTaskList);
      const parent = reorderedTasks.find(t => t.id === parentId);
      
      if (parent) {
        const newDuration = calculateParentDuration(parentId, reorderedTasks);
        if (parent.duration_days !== newDuration) {
          const withUpdatedDurations = updateAncestorDurations(parentId, reorderedTasks);
          const tasksToUpdate = getTasksRequiringUpdates(updatedTaskList, withUpdatedDurations);
          
          try {
            await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
            if (onTasksUpdated) await onTasksUpdated(withUpdatedDurations);
            return { ...deletionResult, updatedTasks: withUpdatedDurations };
          } catch (updateErr) {
            console.warn('Error updating ancestor durations:', updateErr);
          }
        }
      }
      
      if (onTasksUpdated) await onTasksUpdated(reorderedTasks);
      return { ...deletionResult, updatedTasks: reorderedTasks };
    } else {
      // Handle instance task updates
      if (onTasksUpdated) await onTasksUpdated(updatedTaskList);
      return { ...deletionResult, updatedTasks: updatedTaskList };
    }
  };

  /**
   * Get deletion confirmation message for user
   */
  const getDeletionConfirmationMessage = useCallback((taskId, existingTasks) => {
    const analysis = analyzeTaskDeletion(taskId, existingTasks, true);
    const { taskToDelete, hasChildren, totalTasksToDelete } = analysis;
    
    if (!taskToDelete) {
      return 'Are you sure you want to delete this task?';
    }
    
    if (hasChildren) {
      return `Are you sure you want to delete "${taskToDelete.title}" and its ${totalTasksToDelete - 1} child task(s)? This action cannot be undone.`;
    } else {
      return `Are you sure you want to delete "${taskToDelete.title}"? This action cannot be undone.`;
    }
  }, []);

  /**
   * Clear any deletion error state
   */
  const clearDeletionError = useCallback(() => {
    setDeletionError(null);
  }, []);

  /**
   * Reset deletion progress
   */
  const resetProgress = useCallback(() => {
    setDeletionProgress({
      taskId: null,
      step: '',
      isProcessing: false
    });
  }, []);

  /**
   * Check if we can delete (not currently deleting)
   */
  const canDelete = !isDeleting;

  return {
    // Main deletion function
    deleteTask,
    
    // State
    isDeleting,
    deletionError,
    deletionProgress,
    canDelete,
    
    // Helper functions
    getDeletionConfirmationMessage,
    
    // Actions
    clearDeletionError,
    resetProgress
  };
};