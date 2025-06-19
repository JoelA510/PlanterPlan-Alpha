import { useState } from 'react';
import { isDescendantOf } from './taskUtils';
import { updateTaskPosition, updateSiblingPositions } from '../services/taskService';
import { updateDependentTaskDates } from './dateUtils';
import { 
  calculateParentDuration, 
  updateAncestorDurations,
  getTasksRequiringUpdates,
  updateTasksInDatabase,
  calculateSequentialStartDates,
} from './sequentialTaskManager';
import { useTasks } from '../components/contexts/TaskContext';
import { 
  calculateMovePosition, 
  generateNormalizedPositions,
  checkIfRenormalizationNeeded,
  debugPositions 
} from './sparsePositioning';

// Add to the top of useTaskDragAndDrop.js
const taskCache = {
  // Store hierarchical data like children by parent ID
  childrenByParent: new Map(),
  // Store calculated data like levels or effective durations
  calculatedData: new Map(),
  // Method to invalidate parts of the cache
  invalidate: (taskId = null, parentId = null) => {
    if (taskId) {
      // Clear specific task data
      taskCache.calculatedData.delete(taskId);
      
      // Also clear any parent that contains this task as a child
      if (parentId) {
        taskCache.childrenByParent.delete(parentId);
      }
    } else {
      // Clear entire cache on major updates
      taskCache.childrenByParent.clear();
      taskCache.calculatedData.clear();
    }
  }
};

// Add a cached version of the getTaskLevel function
const getCachedTaskLevel = (task, allTasks) => {
  const taskId = task.id;
  
  // Check cache first
  if (taskCache.calculatedData.has(`level_${taskId}`)) {
    return taskCache.calculatedData.get(`level_${taskId}`);
  }
  
  // Calculate the level if not cached
  let level = 0;
  let currentTask = task;
  
  while (currentTask.parent_task_id) {
    level++;
    const parent = allTasks.find(t => t.id === currentTask.parent_task_id);
    if (!parent) break;
    currentTask = parent;
  }
  
  // Store in cache
  taskCache.calculatedData.set(`level_${taskId}`, level);
  
  return level;
};

// Add a cached version of finding children
const getCachedChildren = (parentId, allTasks) => {
  // Check cache first
  if (taskCache.childrenByParent.has(parentId)) {
    return taskCache.childrenByParent.get(parentId);
  }
  
  // Find children
  const children = allTasks
    .filter(t => t.parent_task_id === parentId)
    .sort((a, b) => a.position - b.position);
  
  // Store in cache
  taskCache.childrenByParent.set(parentId, children);
  
  return children;
};


const useTaskDragAndDrop = (tasks, setTasks, fetchTasks) => {
  const { updateTaskAfterDragDrop, updateTasksOptimistic } = useTasks();
  // First, add these constants at the top of useTaskDragAndDrop.js
const POSITION_INCREMENT = 1000; // Base increment between tasks
const MIN_POSITION_GAP = 10;     // Minimum acceptable gap before renormalization


  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before', 'after', 'into'
  const [activeDropZone, setActiveDropZone] = useState(null);

  // Handle drag start
  const handleDragStart = (e, task) => {
    // Prevent top-level tasks from being dragged
    if (!task.parent_task_id) {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.setData('text/plain', task.id);
    setDraggedTask(task);
    
    // Add some delay to allow the drag image to be set
    setTimeout(() => {
      // Hide the original element during drag
      const taskElement = document.getElementById(`task-${task.id}`);
      if (taskElement) {
        taskElement.style.opacity = '0.4';
      }
    }, 0);
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    // Only clear if we're leaving the actual drop target, not its children
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null);
      setDropPosition(null);
    }
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    // Restore visibility
    if (draggedTask) {
      const taskElement = document.getElementById(`task-${draggedTask.id}`);
      if (taskElement) {
        taskElement.style.opacity = '1';
      }
    }
    
    setDraggedTask(null);
    setDropTarget(null);
    setDropPosition(null);
    setActiveDropZone(null);
  };

  // Handle drag over
  const handleDragOver = (e, targetTask) => {
    e.preventDefault();
    
    if (!draggedTask || draggedTask.id === targetTask.id) {
      return;
    }
    
    // Prevent dragging a task into its own descendant
    if (isDescendantOf(targetTask, draggedTask.id, tasks)) {
      return;
    }
    
    // Clear any active drop zone
    setActiveDropZone(null);
    
    // Get the mouse position within the task header
    const headerRect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - headerRect.top;
    const headerHeight = headerRect.height;
    
    // Only handle the "into" position here
    // Top and bottom areas are now handled by drop zones
    if (mouseY >= headerHeight * 0.25 && mouseY <= headerHeight * 0.75) {
      setDropTarget(targetTask);
      setDropPosition('into');
    } else {
      setDropTarget(null);
      setDropPosition(null);
    }
  };

  // Modified function in useTaskDragAndDrop.js
  // Enhanced function for calculating insert position
const calculateInsertPosition = (siblings, newPosition) => {
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

  // Update the relevant part of updateTasksState
const updateTasksState = (newParentId, newPosition, oldParentId, isSameParent) => {
  // Make sure we're working with an array
  if (!Array.isArray(tasks)) {
    console.error('Tasks is not an array:', tasks);
    return; // Exit early if tasks is not an array
  }

  try {
    // Create a deep copy of the tasks array to work with
    const updatedTasks = tasks.map(t => ({...t}));
    
    // Store original draggedTask for later reference
    const originalTask = {...updatedTasks.find(t => t.id === draggedTask.id)};
    
    // 1. Handle old parent container (only normalize positions if many tasks changed)
    if (!isSameParent) {
      const oldSiblings = updatedTasks
        .filter(t => t.parent_task_id === oldParentId && t.id !== draggedTask.id)
        .sort((a, b) => a.position - b.position);
        
      // No need to renumber all siblings when using sparse positioning
      // We only normalize if positions get too close, which we'll handle later
    }
    
    // 2. Handle new parent container
    const newSiblings = updatedTasks
      .filter(t => t.parent_task_id === newParentId && t.id !== draggedTask.id)
      .sort((a, b) => a.position - b.position);
    
    // Calculate the new position using sparse positioning
    const newSparsePosition = calculateInsertPosition(newSiblings, newPosition);
    
    // 3. Update the dragged task
    const taskToUpdate = updatedTasks.find(t => t.id === draggedTask.id);
    if (taskToUpdate) {
      taskToUpdate.parent_task_id = newParentId;
      taskToUpdate.position = newSparsePosition;
      
      // Handle dates if needed (keeping this part as is)
      // [date handling code...]
      // Recalculate days_from_start_until when the parent task changes
      if (newParentId !== oldParentId) {
        // Find the new parent task
        const newParent = updatedTasks.find(t => t.id === newParentId);
        
        if (newParent && newParent.start_date) {
          if (taskToUpdate.start_date) {
            // Calculate days from parent start to this task's start
            const parentStartDate = new Date(newParent.start_date);
            const taskStartDate = new Date(taskToUpdate.start_date);
            
            // Calculate difference in days
            const diffTime = Math.abs(taskStartDate - parentStartDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Update the days_from_start_until property
            taskToUpdate.days_from_start_until_due = diffDays;
          } else {
            // If task has no start date, set a default offset
            taskToUpdate.days_from_start_until_due = 0;
          }
        }
      }
    }
    // 4. For templates: Recalculate display durations
    if (originalTask.origin === 'template') {
      console.log('Recalculating template durations for display...');
      
      // First, update durations for the old parent (if changing parents)
      if (!isSameParent && oldParentId) {
        // Calculate the new duration for the old parent
        const oldParentIndex = updatedTasks.findIndex(t => t.id === oldParentId);
        if (oldParentIndex >= 0) {
          // Calculate using our recursive function, but don't update the database
          const calculatedDuration = calculateParentDuration(oldParentId, updatedTasks);
          
          // Add or update the calculatedDuration display property
          updatedTasks[oldParentIndex].calculatedDuration = calculatedDuration;
          
          // If this old parent has ancestors, update their display durations
          let parentId = updatedTasks[oldParentIndex].parent_task_id;
          while (parentId) {
            const parentIndex = updatedTasks.findIndex(t => t.id === parentId);
            if (parentIndex >= 0) {
              updatedTasks[parentIndex].calculatedDuration = 
                calculateParentDuration(parentId, updatedTasks);
              parentId = updatedTasks[parentIndex].parent_task_id;
            } else {
              break;
            }
          }
        }
      }
      
      // Then, update durations for the new parent
      if (newParentId) {
        const newParentIndex = updatedTasks.findIndex(t => t.id === newParentId);
        if (newParentIndex >= 0) {
          // Calculate using our recursive function, but don't update the database
          const calculatedDuration = calculateParentDuration(newParentId, updatedTasks);
          
          // Add or update the calculatedDuration display property
          updatedTasks[newParentIndex].calculatedDuration = calculatedDuration;
          
          // If this new parent has ancestors, update their display durations
          let parentId = updatedTasks[newParentIndex].parent_task_id;
          while (parentId) {
            const parentIndex = updatedTasks.findIndex(t => t.id === parentId);
            if (parentIndex >= 0) {
              updatedTasks[parentIndex].calculatedDuration = 
                calculateParentDuration(parentId, updatedTasks);
              parentId = updatedTasks[parentIndex].parent_task_id;
            } else {
              break;
            }
          }
        }
      }
    }
    
    // Update the state with our modified task list
    setTasks(updatedTasks);
    
    // Return if we need to renormalize positions
    return checkIfRenormalizationNeeded(updatedTasks, newParentId);
  } catch (err) {
    console.error('Error in updateTasksState:', err);
  }
};
  
  // Add this function to use existing API for batch updates
const updateBatchPositions = async (tasks) => {
  if (!tasks || tasks.length === 0) return { success: true };
  
  try {
    // Create an array of promises for all position updates
    const updatePromises = tasks.map(task => 
      updateTaskPosition(task.id, undefined, task.position)
    );
    
    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);
    
    // Check if any updates failed
    const failedUpdates = results.filter(result => !result.success);
    
    if (failedUpdates.length > 0) {
      console.warn(`${failedUpdates.length} of ${tasks.length} position updates failed`);
      return { 
        success: failedUpdates.length < tasks.length, // Partial success
        error: failedUpdates[0].error
      };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error updating positions in batch:', err);
    return { success: false, error: err.message };
  }
};
  

  // Helper function to update the database
  // Modified updateDatabase function in useTaskDragAndDrop.js
const updateDatabase = async (newParentId, newPosition, oldParentId, isSameParent) => {
  if (!Array.isArray(tasks)) {
    console.error('Tasks is not an array in updateDatabase:', tasks);
    return false; // Exit early
  }

  try {
    console.log('==== DRAG AND DROP DATABASE UPDATE ====');
    console.log('Dragged task:', draggedTask.id, draggedTask.title);
    console.log('New parent ID:', newParentId);
    console.log('New position:', newPosition);
    console.log('Old parent ID:', oldParentId);
    console.log('Is same parent:', isSameParent);

    // Calculate the new sparse position
    const newSiblings = tasks
      .filter(t => t.parent_task_id === newParentId && t.id !== draggedTask.id)
      .sort((a, b) => a.position - b.position);
    
    const newSparsePosition = calculateInsertPosition(newSiblings, newPosition);

    // 1. Update the dragged task in Supabase - ONLY position and parent
    console.log('STEP 1: Updating dragged task position...');
    const updateResult = await updateTaskPosition(draggedTask.id, newParentId, newSparsePosition);
    console.log('Update result:', updateResult);
    
    if (!updateResult.success) {
      console.error('Error updating dragged task:', updateResult.error);
      throw new Error(updateResult.error);
    }
    
    // Check if we need to renormalize positions
    let needsRenormalization = checkIfRenormalizationNeeded(tasks, newParentId);
    
    // Enhanced renormalization in updateDatabase function
if (needsRenormalization) {
  console.log('STEP 2: Renormalizing positions due to tight spacing...');
  
  // Get all siblings at the new parent
  const siblings = tasks
    .filter(t => t.parent_task_id === newParentId)
    .sort((a, b) => a.position - b.position);
  
  // Create normalized positions with large gaps
  // Start at a reasonably large number to prevent future issues
  const START_POSITION = POSITION_INCREMENT; // Start at 1000 rather than small numbers
  
  const updatedSiblings = siblings.map((task, index) => ({
    id: task.id,
    position: Math.floor(START_POSITION + (index * POSITION_INCREMENT))
  }));
  
  console.log('Renormalizing positions for siblings:', updatedSiblings);
  
  // Update all sibling positions at once
  const batchUpdateResult = await updateBatchPositions(updatedSiblings);
  
  // Log and handle any errors, but continue since primary operation succeeded
  if (!batchUpdateResult.success) {
    console.error('Error renormalizing positions:', batchUpdateResult.error);
  } else {
    console.log('Successfully renormalized positions');
    
    // Important: Update the local state with normalized positions too
    const updatedTasks = tasks.map(task => {
      const updated = updatedSiblings.find(s => s.id === task.id);
      if (updated) {
        return { ...task, position: updated.position };
      }
      return task;
    });
    
    // Update the tasks state with normalized positions
    setTasks(updatedTasks);
  }
} }catch (err) {
    console.error('==== DATABASE UPDATE FAILED ====', err);
    throw err; // Rethrow to be caught by the calling function
  }
};

  
  // New helper function to update task dates in the database
  const updateTaskDates = async (taskId, dateData) => {
    try {
      // You'll need to implement this function in your taskService
      // For now, we'll just log the intention
      console.log('Updating dates for task', taskId, dateData);
      
      // This should be implemented in your taskService.js file
      // return await updateTaskDateFields(taskId, dateData);
      
      // Placeholder return until implemented
      return { success: true };
    } catch (err) {
      console.error('Error updating task dates:', err);
      return { success: false, error: err.message };
    }
  };
// Update handleDrop in useTaskDragAndDrop.js
// Update handleDrop in useTaskDragAndDrop.js
const handleDr = async (e, targetTask) => {
  e.preventDefault();

  // Validate essential data is present
  if (!draggedTask || !dropTarget || !dropPosition) {
    return;
  }

  try {
    // Calculate the new parent ID and position
    let newParentId, newPosition;

    // Case 1: Dropping INTO a task (making it a child)
    if (dropPosition === 'into') {
      newParentId = targetTask.id;
      
      // Count existing children to place at the end
      const children = tasks.filter(t => t.parent_task_id === targetTask.id);
      newPosition = children.length;
    } 
    // Case 2: Dropping BETWEEN tasks (after or before)
    else if (dropPosition === 'between-after' || dropPosition === 'between-before') {
      newParentId = targetTask.parent_task_id;
      
      // Get siblings at the target level (excluding the dragged task)
      const siblings = tasks
        .filter(t => t.parent_task_id === targetTask.parent_task_id && t.id !== draggedTask.id)
        .sort((a, b) => a.position - b.position);
      
      // Find the target's index among its siblings
      const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
      
      // Position depends on whether we're dropping before or after
      newPosition = dropPosition === 'between-after' ? targetIndex + 1 : targetIndex;
    }

    // Track whether we're changing parents
    const oldParentId = draggedTask.parent_task_id;
    const isSameParent = oldParentId === newParentId;
    
    // STEP 1: Optimistically update the frontend state
    updateTasksState(newParentId, newPosition, oldParentId, isSameParent);
    
    // STEP 2: Update the database
    // Instead of calling updateDatabase directly, use our new function
    // await updateTaskAfterDragDrop(draggedTask.id, newParentId, newPosition, oldParentId);
    
  } catch (err) {
    console.error('Error updating task positions:', err);
    alert('Failed to update task position. Please try again.');
    
    // Revert to the original state in case of error
    fetchTasks();
  } finally {
    // Reset drag state
    setDraggedTask(null);
    setDropTarget(null);
    setDropPosition(null);
  }
};

// Optional helper function to refresh just a subset of tasks
const fetchTasksForParent = async (parentId) => {
  try {
    // This would be a modified version of your existing fetchTasks 
    // that filters by parentId to minimize data transferred
    console.log(`Refreshing tasks for parent ${parentId}...`);
    
    // For now, let's simulate this with the full fetch
    // In a real implementation, you'd create a more targeted endpoint
    await fetchTasks(true);
    
    // Clear relevant cache entries
    taskCache.invalidate(null, parentId);
  } catch (error) {
    console.error('Error refreshing tasks:', error);
  }
};
  
  // Handler for dragging over a drop zone
  const handleDropZoneDragOver = (e, parentId, position, prevTask, nextTask) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    // Don't allow dropping between a task and itself
    if ((prevTask && draggedTask.id === prevTask.id) || 
        (nextTask && draggedTask.id === nextTask.id)) {
      return;
    }
    
    // Don't allow dragging a task into its own descendant's container
    if (prevTask && isDescendantOf(prevTask, draggedTask.id, tasks)) {
      return;
    }
    
    if (nextTask && isDescendantOf(nextTask, draggedTask.id, tasks)) {
      return;
    }
    
    // Set the active drop zone
    setActiveDropZone({ parentId, position });
    
    // Reset the task drop target (we're not dropping onto a task)
    setDropTarget(null);
    setDropPosition(null);
  };

  // Handler for leaving a drop zone
  const handleDropZoneDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setActiveDropZone(null);
    }
  };

  // Handler for dropping on a drop zone
  const handleDropZoneDro = async (e, parentId, position) => {
    e.preventDefault();
    
    if (!draggedTask || !activeDropZone) return;
    
    try {
      // Calculate the new position
      const newParentId = parentId;
      const newPosition = position;
      
      // Track whether we're changing parents
      const oldParentId = draggedTask.parent_task_id;
      const isSameParent = oldParentId === newParentId;
      
      // Optimistically update the frontend state
      updateTasksState(newParentId, newPosition, oldParentId, isSameParent);
      
      // Update the database
      await updateDatabase(newParentId, newPosition, oldParentId, isSameParent);
    
    } catch (err) {
      console.error('Error updating task positions:', err);
      alert('Failed to update task position. Please try again.');
      fetchTasks();
    } finally {
      // Reset drag state
      setDraggedTask(null);
      setActiveDropZone(null);
      setDropTarget(null);
      setDropPosition(null);
    }
  };

  // Helper function to check if a drop zone is active
  const isDropZoneActive = (parentId, position) => {
    return activeDropZone && 
          activeDropZone.parentId === parentId && 
          activeDropZone.position === position;
  };

  // Add a function to check if renormalization is needed
  // Enhanced function to check if renormalization is needed
const checkIfRenormalizationNeeded = (tasks, parentId) => {
  const siblings = tasks
    .filter(t => t.parent_task_id === parentId)
    .sort((a, b) => a.position - b.position);
  
  // Early return if there are no siblings or just one task
  if (siblings.length <= 1) return false;
  
  // Check if first position is too small (this fixes your specific issue)
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

// Update the syncToServer function to use the optimistic version
const syncToServer = async (taskId, newParentId, newPosition, oldParentId) => {
  try {
    // console.log('🔄 Background sync starting for task:', taskId);
    // console.log('🔄 Array index received:', newPosition); // This will be 0,1,2...
    
    // ✅ Calculate sparse position from the array index
    const newSiblings = tasks
      .filter(t => t.parent_task_id === newParentId && t.id !== taskId)
      .sort((a, b) => a.position - b.position);
    
    const sparsePosition = calculateInsertPosition(newSiblings, newPosition);
    console.log('🔄 Calculated sparse position:', sparsePosition); // This will be 1000,2000...
    
    // Use sparse position instead of array index
    await updateTaskAfterDragDrop(taskId, newParentId, sparsePosition, oldParentId);
    console.log('✅ Background sync completed for task:', taskId);
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
};

// Enhanced updateTasksState for immediate client calculations
const updateTasksStateOptimistic = (newParentId, newPosition, oldParentId, isSameParent) => {
  if (!Array.isArray(tasks)) {
    console.error('Tasks is not an array:', tasks);
    return;
  }

  try {
    console.log('🚀 Optimistic update starting...');
    
    // Create a deep copy of the tasks array
    const updatedTasks = tasks.map(t => ({...t}));
    
    // Store original draggedTask for reference
    const originalTask = {...updatedTasks.find(t => t.id === draggedTask.id)};
    
    // Calculate sparse position for the dragged task
    const newSiblings = updatedTasks
      .filter(t => t.parent_task_id === newParentId && t.id !== draggedTask.id)
      .sort((a, b) => a.position - b.position);
    
    const newSparsePosition = calculateInsertPosition(newSiblings, newPosition);
    
    // Update the dragged task's position and parent
    const taskToUpdate = updatedTasks.find(t => t.id === draggedTask.id);
    if (taskToUpdate) {
      taskToUpdate.parent_task_id = newParentId;
      taskToUpdate.position = newSparsePosition;
      
      console.log(`📍 Updated task position: ${taskToUpdate.title} → position ${newSparsePosition}`);
    }

    // Recalculate durations and dates for affected hierarchy
    let finalTasks = [...updatedTasks];

    // Find the root project to recalculate from
    const findRootProject = (task, allTasks) => {
      if (!task.parent_task_id) return task;
      const parent = allTasks.find(t => t.id === task.parent_task_id);
      return parent ? findRootProject(parent, allTasks) : task;
    };

    const movedTask = finalTasks.find(t => t.id === draggedTask.id);
    const rootProject = findRootProject(movedTask, finalTasks);

    if (rootProject && rootProject.start_date) {
      console.log(`🔄 Recalculating dates from root: ${rootProject.title}`);
      
      // Use existing utility to recalculate all dates sequentially
      finalTasks = calculateSequentialStartDates(
        rootProject.id, 
        rootProject.start_date, 
        finalTasks
      );
      
      console.log('📅 Sequential dates recalculated');
    }

    // For instance tasks, also update parent durations
    if (originalTask.origin === 'instance') {
      console.log('📊 Updating parent durations for instance task...');
      
      // Update old parent duration if changing parents
      if (!isSameParent && oldParentId) {
        const oldParentIndex = finalTasks.findIndex(t => t.id === oldParentId);
        if (oldParentIndex >= 0) {
          const hasChildren = finalTasks.some(t => t.parent_task_id === oldParentId);
          if (hasChildren) {
            const newDuration = calculateParentDuration(oldParentId, finalTasks);
            finalTasks[oldParentIndex].duration_days = newDuration;
            console.log(`📊 Old parent duration updated: ${newDuration} days`);
          }
        }
      }
      
      // Update new parent duration
      if (newParentId) {
        const newParentIndex = finalTasks.findIndex(t => t.id === newParentId);
        if (newParentIndex >= 0) {
          const hasChildren = finalTasks.some(t => t.parent_task_id === newParentId);
          if (hasChildren) {
            const newDuration = calculateParentDuration(newParentId, finalTasks);
            finalTasks[newParentIndex].duration_days = newDuration;
            console.log(`📊 New parent duration updated: ${newDuration} days`);
          }
        }
      }
    }

    console.log('✅ Optimistic update complete - updating UI');
    
    // Update the state with all calculated changes
    setTasks(finalTasks);
    updateTasksOptimistic(finalTasks);
    
  } catch (err) {
    console.error('❌ Error in optimistic update:', err);
    // Don't throw - let the operation continue
  }
};

// Updated handleDrop function
const handleDrop = async (e, targetTask) => {
  e.preventDefault();

  if (!draggedTask || !dropTarget || !dropPosition) {
    return;
  }

  try {
    // Calculate the new parent ID and position
    let newParentId, newPosition;

    if (dropPosition === 'into') {
      newParentId = targetTask.id;
      const children = tasks.filter(t => t.parent_task_id === targetTask.id);
      newPosition = children.length;
    } 
    else if (dropPosition === 'between-after' || dropPosition === 'between-before') {
      newParentId = targetTask.parent_task_id;
      const siblings = tasks
        .filter(t => t.parent_task_id === targetTask.parent_task_id && t.id !== draggedTask.id)
        .sort((a, b) => a.position - b.position);
      
      const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
      newPosition = dropPosition === 'between-after' ? targetIndex + 1 : targetIndex;
    }

    const oldParentId = draggedTask.parent_task_id;
    const isSameParent = oldParentId === newParentId;
    
    console.log('🎯 Drop detected - starting optimistic update');
    
    // STEP 1: Update UI immediately (optimistic)
    updateTasksStateOptimistic(newParentId, newPosition, oldParentId, isSameParent);
    
    // STEP 2: Sync to server in background (don't await)
    syncToServer(draggedTask.id, newParentId, newPosition, oldParentId);
    
  } catch (err) {
    console.error('❌ Error in handleDrop:', err);
    alert('Failed to update task position. Please refresh the page.');
  } finally {
    // Reset drag state immediately
    setDraggedTask(null);
    setDropTarget(null);
    setDropPosition(null);
  }
};

// Updated handleDropZoneDrop function
const handleDropZoneDrop = async (e, parentId, position) => {
  e.preventDefault();
  
  if (!draggedTask || !activeDropZone) return;
  
  try {
    const newParentId = parentId;
    const newPosition = position;
    const oldParentId = draggedTask.parent_task_id;
    const isSameParent = oldParentId === newParentId;
    
    console.log('🎯 Drop zone drop - starting optimistic update');
    
    // STEP 1: Update UI immediately (optimistic)
    updateTasksStateOptimistic(newParentId, newPosition, oldParentId, isSameParent);
    
    // STEP 2: Sync to server in background (don't await)
    syncToServer(draggedTask.id, newParentId, newPosition, oldParentId);
    
  } catch (err) {
    console.error('❌ Error in handleDropZoneDrop:', err);
    alert('Failed to update task position. Please refresh the page.');
  } finally {
    // Reset drag state immediately
    setDraggedTask(null);
    setActiveDropZone(null);
    setDropTarget(null);
    setDropPosition(null);
  }
};

  return {
    draggedTask,
    dropTarget,
    dropPosition,
    activeDropZone,
    handleDragStart,
    handleDragLeave,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleDropZoneDragOver,
    handleDropZoneDragLeave,
    handleDropZoneDrop,
    isDropZoneActive
  };
};

export default useTaskDragAndDrop;