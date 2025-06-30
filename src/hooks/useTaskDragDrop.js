import { useState, useCallback, useRef } from 'react';
import { updateTaskPosition } from '../services/taskService';
import { 
  getNextAvailablePosition,
  calculateInsertPosition,
  checkIfRenormalizationNeeded 
} from '../utils/sparsePositioning';
import { 
  getTaskLevel, 
  getBackgroundColor, 
  isDescendantOf 
} from '../utils/taskUtils';

/**
 * Enhanced hook for task drag and drop operations
 * Handles both UI state and server-side updates with comprehensive error handling
 */
export const useTaskDragDrop = () => {
  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  const [activeDropZone, setActiveDropZone] = useState(null);
  
  // Update state
  const [isUpdatingPosition, setIsUpdatingPosition] = useState(false);
  const [positionUpdateError, setPositionUpdateError] = useState(null);
  const [updateProgress, setUpdateProgress] = useState({
    taskId: null,
    step: '',
    isProcessing: false
  });

  // Cache for performance optimization
  const taskCache = useRef({
    childrenByParent: new Map(),
    calculatedData: new Map(),
    invalidate: (taskId = null, parentId = null) => {
      if (taskId) {
        taskCache.current.calculatedData.delete(taskId);
      }
      if (parentId) {
        taskCache.current.childrenByParent.delete(parentId);
      }
      if (!taskId && !parentId) {
        taskCache.current.childrenByParent.clear();
        taskCache.current.calculatedData.clear();
      }
    }
  });

  /**
   * Update task position after drag and drop with full integration
   * @param {string} taskId - The task being moved
   * @param {string} newParentId - New parent task ID
   * @param {number} newPosition - New position in parent
   * @param {string} oldParentId - Previous parent task ID
   * @param {Object} options - Update options
   * @param {Array} options.existingTasks - Current tasks array
   * @param {Function} options.onPositionUpdated - Callback when position is updated
   * @param {Function} options.onTasksRefreshed - Callback when tasks are refreshed
   * @param {Function} options.onDateRecalculationNeeded - Callback for date recalculation
   * @returns {Promise<{success, error}>} - Result of position update
   */
  const updateTaskAfterDragDrop = useCallback(async (taskId, newParentId, newPosition, oldParentId, options = {}) => {
    const { 
      existingTasks = [], 
      onPositionUpdated = null,
      onTasksRefreshed = null,
      onDateRecalculationNeeded = null
    } = options;

    try {
      setIsUpdatingPosition(true);
      setPositionUpdateError(null);
      setUpdateProgress({
        taskId,
        step: 'Analyzing position update...',
        isProcessing: true
      });

      console.log(`Updating task after drag/drop: task=${taskId}, newParent=${newParentId}, newPos=${newPosition}`);

      // Analyze the drag and drop operation
      const updateAnalysis = analyzeDragDropOperation(taskId, newParentId, newPosition, oldParentId, existingTasks);
      
      setUpdateProgress({
        taskId,
        step: 'Updating position in database...',
        isProcessing: true
      });

      // Calculate the actual sparse position to use
      const sparsePosition = calculateSparsePosition(newParentId, newPosition, existingTasks, taskId);

      // Update position in database
      const result = await updateTaskPosition(taskId, newParentId, sparsePosition);

      if (result.error) {
        throw new Error(result.error || 'Failed to update task position');
      }

      setUpdateProgress({
        taskId,
        step: 'Refreshing task data...',
        isProcessing: true
      });

      // Force refresh tasks to get updated positions
      if (onTasksRefreshed) {
        await onTasksRefreshed();
      }

      // Determine which tasks need date recalculation
      const affectedTaskIds = getAffectedTasksForDragDrop(
        taskId, 
        newParentId, 
        oldParentId, 
        existingTasks
      );

      if (onDateRecalculationNeeded && affectedTaskIds.length > 0) {
        setUpdateProgress({
          taskId,
          step: 'Recalculating dates...',
          isProcessing: true
        });
        
        await onDateRecalculationNeeded(affectedTaskIds);
      }

      // Invalidate cache for affected areas
      taskCache.current.invalidate(taskId, newParentId);
      if (oldParentId && oldParentId !== newParentId) {
        taskCache.current.invalidate(null, oldParentId);
      }

      console.log('Task position updated successfully');
      return { success: true };

    } catch (err) {
      console.error('Error updating tasks after drag/drop:', err);
      const errorMessage = err.message;
      setPositionUpdateError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdatingPosition(false);
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
   * Handle drag start event
   */
  const handleDragStart = useCallback((e, task) => {
    e.preventDefault();
    e.stopPropagation();
    
    e.dataTransfer.setData('text/plain', task.id);
    setDraggedTask(task);
    
    // Add visual feedback
    setTimeout(() => {
      const taskElement = document.getElementById(`task-${task.id}`);
      if (taskElement) {
        taskElement.classList.add('being-dragged');
      }
    }, 0);
  }, []);

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((e, targetTask, existingTasks = []) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    // Prevent dropping on descendants
    if (isDescendantOf(targetTask, draggedTask.id, existingTasks)) {
      return;
    }
    
    const headerRect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const relativeY = (mouseY - headerRect.top) / headerRect.height;
    
    if (relativeY < 0.5) {
      setDropTarget(targetTask);
      setDropPosition('before');
    } else {
      setDropTarget(targetTask);
      setDropPosition('into');
    }
  }, [draggedTask]);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null);
      setDropPosition(null);
    }
  }, []);

  /**
   * Handle drag end event
   */
  const handleDragEnd = useCallback((e) => {
    e.preventDefault();
    
    // Remove visual feedback
    if (draggedTask) {
      const taskElement = document.getElementById(`task-${draggedTask.id}`);
      if (taskElement) {
        taskElement.classList.remove('being-dragged');
      }
    }
    
    setDraggedTask(null);
    setDropTarget(null);
    setDropPosition(null);
    setActiveDropZone(null);
  }, [draggedTask]);

  /**
   * Handle successful drop event
   */
  const handleDrop = useCallback(async (e, targetTask, existingTasks = [], updateCallback = null) => {
    e.preventDefault();
    
    if (!draggedTask || !targetTask) return;
    
    try {
      // Calculate new position based on drop target and position
      const { newParentId, newPosition } = calculateDropPosition(
        draggedTask, 
        targetTask, 
        dropPosition, 
        existingTasks
      );
      
      const oldParentId = draggedTask.parent_task_id;
      
      // Perform the position update
      if (updateCallback) {
        const result = await updateCallback(
          draggedTask.id, 
          newParentId, 
          newPosition, 
          oldParentId
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update position');
        }
      }
      
    } catch (err) {
      console.error('Error in handleDrop:', err);
      setPositionUpdateError(err.message);
    } finally {
      handleDragEnd(e);
    }
  }, [draggedTask, dropPosition, handleDragEnd]);

  /**
   * Handle drop zone drag over
   */
  const handleDropZoneDragOver = useCallback((e, parentId, position, prevTask, nextTask, existingTasks = []) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    // Prevent invalid drops
    if (prevTask && isDescendantOf(prevTask, draggedTask.id, existingTasks)) {
      return;
    }
    if (nextTask && isDescendantOf(nextTask, draggedTask.id, existingTasks)) {
      return;
    }
    
    setActiveDropZone({ parentId, position });
  }, [draggedTask]);

  /**
   * Handle drop zone drag leave
   */
  const handleDropZoneDragLeave = useCallback((e) => {
    e.preventDefault();
    setActiveDropZone(null);
  }, []);

  /**
   * Handle drop zone drop
   */
  const handleDropZoneDrop = useCallback(async (e, parentId, position, existingTasks = [], updateCallback = null) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    try {
      const oldParentId = draggedTask.parent_task_id;
      const newParentId = parentId;
      const newPosition = position;
      
      // Perform the position update
      if (updateCallback) {
        const result = await updateCallback(
          draggedTask.id, 
          newParentId, 
          newPosition, 
          oldParentId
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update position');
        }
      }
      
    } catch (err) {
      console.error('Error in handleDropZoneDrop:', err);
      setPositionUpdateError(err.message);
    } finally {
      handleDragEnd(e);
    }
  }, [draggedTask, handleDragEnd]);

  /**
   * Check if a drop zone is currently active
   */
  const isDropZoneActive = useCallback((parentId, position) => {
    return activeDropZone && 
           activeDropZone.parentId === parentId && 
           activeDropZone.position === position;
  }, [activeDropZone]);

  /**
   * Get visual feedback for drag operations
   */
  const getDragFeedback = useCallback((task, existingTasks = []) => {
    if (!draggedTask) {
      return { isDragging: false, canDrop: true, isTarget: false };
    }
    
    const isDragging = task.id === draggedTask.id;
    const canDrop = !isDescendantOf(task, draggedTask.id, existingTasks);
    const isTarget = dropTarget && dropTarget.id === task.id;
    
    return { isDragging, canDrop, isTarget, dropPosition };
  }, [draggedTask, dropTarget, dropPosition]);

  /**
   * Analyze drag and drop operation
   */
  const analyzeDragDropOperation = (taskId, newParentId, newPosition, oldParentId, existingTasks) => {
    const task = existingTasks.find(t => t.id === taskId);
    const isSameParent = oldParentId === newParentId;
    const isTemplate = task?.origin === 'template';
    
    return {
      task,
      isSameParent,
      isTemplate,
      parentChanged: !isSameParent,
      needsRenormalization: checkIfRenormalizationNeeded(existingTasks, newParentId)
    };
  };

  /**
   * Calculate the sparse position to use for the new location
   */
  const calculateSparsePosition = (parentId, position, existingTasks, excludeTaskId) => {
    const siblings = existingTasks
      .filter(t => t.parent_task_id === parentId && t.id !== excludeTaskId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    return calculateInsertPosition(siblings, position);
  };

  /**
   * Calculate drop position based on target and drop location
   */
  const calculateDropPosition = (draggedTask, targetTask, dropPosition, existingTasks) => {
    if (dropPosition === 'into') {
      return {
        newParentId: targetTask.id,
        newPosition: 0
      };
    } else {
      // Drop before target
      const siblings = existingTasks
        .filter(t => t.parent_task_id === targetTask.parent_task_id && t.id !== draggedTask.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
      
      return {
        newParentId: targetTask.parent_task_id,
        newPosition: targetIndex
      };
    }
  };

  /**
   * Get tasks affected by drag and drop for date recalculation
   */
  const getAffectedTasksForDragDrop = (taskId, newParentId, oldParentId, existingTasks) => {
    const affectedTaskIds = [taskId];
    
    // Add old siblings (if parent changed)
    if (oldParentId && oldParentId !== newParentId) {
      const oldSiblings = existingTasks.filter(t => t.parent_task_id === oldParentId);
      affectedTaskIds.push(...oldSiblings.map(t => t.id));
    }
    
    // Add new siblings
    if (newParentId) {
      const newSiblings = existingTasks.filter(t => t.parent_task_id === newParentId);
      affectedTaskIds.push(...newSiblings.map(t => t.id));
    }
    
    return [...new Set(affectedTaskIds)];
  };

  /**
   * Clear position update error
   */
  const clearPositionUpdateError = useCallback(() => {
    setPositionUpdateError(null);
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
   * Get current drag and drop status
   */
  const getDragDropStatus = useCallback(() => {
    return {
      isDragging: !!draggedTask,
      isUpdating: isUpdatingPosition,
      hasError: !!positionUpdateError,
      draggedTaskId: draggedTask?.id || null,
      currentStep: updateProgress.step || ''
    };
  }, [draggedTask, isUpdatingPosition, positionUpdateError, updateProgress]);

  return {
    // Main drag and drop function
    updateTaskAfterDragDrop,
    
    // Drag and drop handlers
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    
    // Drop zone handlers
    handleDropZoneDragOver,
    handleDropZoneDragLeave,
    handleDropZoneDrop,
    isDropZoneActive,
    
    // State
    draggedTask,
    dropTarget,
    dropPosition,
    activeDropZone,
    isUpdatingPosition,
    positionUpdateError,
    updateProgress,
    
    // Helper functions
    getDragFeedback,
    getDragDropStatus,
    
    // Actions
    clearPositionUpdateError,
    resetProgress
  };
};