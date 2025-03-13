import { useState } from 'react';
import { isDescendantOf } from './taskUtils';
import { updateTaskPosition, updateSiblingPositions } from '../services/taskService';

const useTaskDragAndDrop = (tasks, setTasks, fetchTasks) => {
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

  // Handle drop
  const handleDrop = async (e, targetTask) => {
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
        const childrenCount = tasks.filter(t => t.parent_task_id === targetTask.id && t.id !== draggedTask.id).length;
        newPosition = childrenCount;
      } 
      // Case 2: Dropping BETWEEN tasks (after the target task)
      else if (dropPosition === 'between-after') {
        // If target has an ID, it's a task; otherwise, it's the root
        newParentId = targetTask.parent_task_id;
        
        // Get siblings at the target level (excluding the dragged task)
        const siblings = tasks
          .filter(t => t.parent_task_id === targetTask.parent_task_id)
          .filter(t => t.id !== draggedTask.id)
          .sort((a, b) => a.position - b.position);
        
        // Find the target's index among its siblings
        const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
        
        // For between-after, position is after the target
        newPosition = targetIndex + 1;
      }
      // Case 3: Dropping BETWEEN tasks (before the target task)
      else if (dropPosition === 'between-before') {
        newParentId = targetTask.parent_task_id;
        
        // Get siblings at the target level (excluding the dragged task)
        const siblings = tasks
          .filter(t => t.parent_task_id === targetTask.parent_task_id)
          .filter(t => t.id !== draggedTask.id)
          .sort((a, b) => a.position - b.position);
        
        // Find the target's index among its siblings
        const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
        
        // For between-before, position is at the target
        newPosition = targetIndex >= 0 ? targetIndex : 0;
      }
  
      // Track whether we're changing parents
      const oldParentId = draggedTask.parent_task_id;
      const isSameParent = oldParentId === newParentId;
  
      // Store original positions for rollback if needed
      const originalTasks = [...tasks];
      
      // STEP 1: Optimistically update the frontend state
      updateTasksState(newParentId, newPosition, oldParentId, isSameParent);
      
      // STEP 2: Update the database
      await updateDatabase(newParentId, newPosition, oldParentId, isSameParent);
      
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
  const handleDropZoneDrop = async (e, parentId, position) => {
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

  // Helper function to update the tasks state
  const updateTasksState = (newParentId, newPosition, oldParentId, isSameParent) => {
    setTasks(prevTasks => {
      // Create a deep copy to work with
      const updatedTasks = prevTasks.map(t => ({...t}));
      
      // 1. Handle old parent container (update positions of remaining tasks)
      if (!isSameParent) {
        const oldSiblings = updatedTasks
          .filter(t => t.parent_task_id === oldParentId && t.id !== draggedTask.id)
          .sort((a, b) => a.position - b.position);
          
        // Normalize positions after removing the dragged task
        oldSiblings.forEach((task, index) => {
          task.position = index;
        });
      }
      
      // 2. Handle new parent container (make space for dragged task)
      const newSiblings = updatedTasks
        .filter(t => t.parent_task_id === newParentId && t.id !== draggedTask.id)
        .sort((a, b) => a.position - b.position);
      
      // Shift positions for tasks after the insertion point
      newSiblings.forEach(task => {
        if (task.position >= newPosition) {
          task.position += 1;
        }
      });
      
      // 3. Update the dragged task
      const taskToUpdate = updatedTasks.find(t => t.id === draggedTask.id);
      if (taskToUpdate) {
        taskToUpdate.parent_task_id = newParentId;
        taskToUpdate.position = newPosition;
      }
      
      return updatedTasks;
    });
  };

  // Helper function to update the database
  const updateDatabase = async (newParentId, newPosition, oldParentId, isSameParent) => {
    // 1. Update the dragged task in Supabase
    const updateResult = await updateTaskPosition(draggedTask.id, newParentId, newPosition);
    if (!updateResult.success) throw new Error(updateResult.error);
    
    // 2. Update positions in old parent container (if we changed parents)
    if (!isSameParent) {
      const oldSiblings = tasks
        .filter(t => t.parent_task_id === oldParentId && t.id !== draggedTask.id)
        .sort((a, b) => a.position - b.position)
        .map((task, index) => ({
          ...task,
          position: index
        }));
      
      const updateOldResult = await updateSiblingPositions(oldSiblings);
      if (!updateOldResult.success) throw new Error(updateOldResult.error);
    }
    
    // 3. Update positions in new parent container
    const newSiblings = tasks
      .filter(t => t.parent_task_id === newParentId && t.id !== draggedTask.id)
      .sort((a, b) => a.position - b.position)
      .map((task, i) => {
        // Calculate the correct position (accounting for the insertion)
        let correctPosition = i;
        if (i >= newPosition) correctPosition = i + 1;
        
        return {
          ...task,
          position: correctPosition
        };
      })
      .filter(task => task.position !== tasks.find(t => t.id === task.id)?.position);
    
    const updateNewResult = await updateSiblingPositions(newSiblings);
    if (!updateNewResult.success) throw new Error(updateNewResult.error);
  };

  // Helper function to check if a drop zone is active
  const isDropZoneActive = (parentId, position) => {
    return activeDropZone && 
          activeDropZone.parentId === parentId && 
          activeDropZone.position === position;
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