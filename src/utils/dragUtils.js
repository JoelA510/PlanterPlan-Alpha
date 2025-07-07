// src/utils/dragUtils.js
// Reusable drag & drop utilities for HTML5 drag operations

/**
 * Constants for drag & drop operations
 */
export const DRAG_CONSTANTS = {
  DATA_TRANSFER_KEY: 'text/plain',
  DROP_EFFECT: 'move',
  POSITION_MULTIPLIER: 1000, // For sparse positioning
  MIN_TOUCH_TARGET: 44, // Minimum touch target size (iOS HIG)
  ACTIVATION_DISTANCE: 8, // Pixels to move before drag starts
};

/**
 * Drag event data structure helpers
 */
export const createDragData = (taskId, additionalData = {}) => {
  return {
    taskId,
    timestamp: Date.now(),
    ...additionalData
  };
};

export const extractDragData = (dataTransfer) => {
  try {
    const taskId = dataTransfer.getData(DRAG_CONSTANTS.DATA_TRANSFER_KEY);
    return taskId ? { taskId } : null;
  } catch (error) {
    console.warn('Failed to extract drag data:', error);
    return null;
  }
};

/**
 * Position calculation utilities
 */
export const calculateSparsePosition = (siblings, insertIndex) => {
  // Insert at beginning
  if (insertIndex === 0) {
    const firstSibling = siblings[0];
    return firstSibling ? Math.max(1, Math.floor(firstSibling.position / 2)) : DRAG_CONSTANTS.POSITION_MULTIPLIER;
  }
  
  // Insert at end
  if (insertIndex >= siblings.length) {
    const lastSibling = siblings[siblings.length - 1];
    return lastSibling ? lastSibling.position + DRAG_CONSTANTS.POSITION_MULTIPLIER : DRAG_CONSTANTS.POSITION_MULTIPLIER;
  }
  
  // Insert between siblings
  const beforeSibling = siblings[insertIndex - 1];
  const afterSibling = siblings[insertIndex];
  const midpoint = Math.floor((beforeSibling.position + afterSibling.position) / 2);
  
  return Math.max(beforeSibling.position + 1, midpoint);
};

export const calculateDropPosition = (draggedTask, targetTask, allTasks, dropType = 'onto') => {
  if (!draggedTask || !targetTask) return null;
  
  const draggedIndex = allTasks.findIndex(t => t.id === draggedTask.id);
  const targetIndex = allTasks.findIndex(t => t.id === targetTask.id);
  
  switch (dropType) {
    case 'onto':
      // Dropping onto another task - determine insert position
      if (targetTask.parent_task_id === draggedTask.parent_task_id) {
        // Same parent - reorder
        const siblings = allTasks
          .filter(t => t.parent_task_id === targetTask.parent_task_id && t.id !== draggedTask.id)
          .sort((a, b) => a.position - b.position);
        
        const targetSiblingIndex = siblings.findIndex(t => t.id === targetTask.id);
        const insertIndex = draggedIndex < targetIndex ? targetSiblingIndex + 1 : targetSiblingIndex;
        const newPosition = calculateSparsePosition(siblings, insertIndex);
        
        return {
          parentId: targetTask.parent_task_id,
          position: newPosition,
          type: 'reorder'
        };
      } else {
        // Different parent - move to target's parent
        return {
          parentId: targetTask.parent_task_id,
          position: targetTask.position + 500,
          type: 'move'
        };
      }
      
    case 'into':
      // Dropping into a container
      const existingChildren = allTasks.filter(t => t.parent_task_id === targetTask.id);
      const newPosition = existingChildren.length > 0 ? 
        Math.max(...existingChildren.map(t => t.position || 0)) + DRAG_CONSTANTS.POSITION_MULTIPLIER : 
        DRAG_CONSTANTS.POSITION_MULTIPLIER;
      
      return {
        parentId: targetTask.id,
        position: newPosition,
        type: 'nest'
      };
      
    case 'between':
      // Dropping between tasks at a specific position
      return {
        parentId: targetTask.parent_task_id,
        position: targetTask.position * DRAG_CONSTANTS.POSITION_MULTIPLIER,
        type: 'insert'
      };
      
    default:
      console.warn('Unknown drop type:', dropType);
      return null;
  }
};

/**
 * Drag validation utilities
 */
export const canTaskBeDragged = (task) => {
  // Top-level tasks (projects) cannot be dragged
  if (!task.parent_task_id) return false;
  
  // Completed tasks can be dragged (user might want to reorganize)
  // Add other business rules here as needed
  return true;
};

export const canDropOnTarget = (draggedTask, targetTask, dropType = 'onto') => {
  if (!draggedTask || !targetTask) return false;
  
  // Can't drop task onto itself
  if (draggedTask.id === targetTask.id) return false;
  
  // Can't drop a parent onto its own descendant (would create circular reference)
  if (isDescendantOf(targetTask, draggedTask.id)) return false;
  
  switch (dropType) {
    case 'onto':
    case 'between':
      return true; // Most drops are allowed
      
    case 'into':
      // Only allow dropping into container tasks (not leaf tasks)
      // You can customize this logic based on your business rules
      return true;
      
    default:
      return false;
  }
};

export const isDescendantOf = (potentialDescendant, potentialAncestorId, allTasks = []) => {
  let current = potentialDescendant;
  const visited = new Set(); // Prevent infinite loops
  
  while (current && current.parent_task_id && !visited.has(current.id)) {
    visited.add(current.id);
    
    if (current.parent_task_id === potentialAncestorId) {
      return true;
    }
    
    current = allTasks.find(t => t.id === current.parent_task_id);
  }
  
  return false;
};

/**
 * Touch device detection and handling
 */
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const addTouchSupport = (element, handlers) => {
  if (!isTouchDevice()) return;
  
  let touchStartPos = null;
  let isDragging = false;
  
  const handleTouchStart = (e) => {
    touchStartPos = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
    isDragging = false;
  };
  
  const handleTouchMove = (e) => {
    if (!touchStartPos) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartPos.x;
    const deltaY = touch.clientY - touchStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > DRAG_CONSTANTS.ACTIVATION_DISTANCE && !isDragging) {
      isDragging = true;
      if (handlers.onDragStart) {
        handlers.onDragStart(e);
      }
    }
    
    if (isDragging && handlers.onDragMove) {
      handlers.onDragMove(e, { deltaX, deltaY, distance });
    }
  };
  
  const handleTouchEnd = (e) => {
    if (isDragging && handlers.onDragEnd) {
      handlers.onDragEnd(e);
    }
    
    touchStartPos = null;
    isDragging = false;
  };
  
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
  };
};

/**
 * Accessibility helpers
 */
export const addKeyboardDragSupport = (element, handlers) => {
  let selectedElement = null;
  
  const handleKeyDown = (e) => {
    switch (e.key) {
      case ' ':
      case 'Enter':
        // Space or Enter to pick up/drop
        e.preventDefault();
        if (!selectedElement) {
          selectedElement = e.target;
          if (handlers.onDragStart) {
            handlers.onDragStart({ target: selectedElement });
          }
          // Visual feedback for screen readers
          selectedElement.setAttribute('aria-grabbed', 'true');
          announceToScreenReader('Item picked up. Use arrow keys to move, Enter to drop, Escape to cancel.');
        } else {
          if (handlers.onDragEnd) {
            handlers.onDragEnd({ target: selectedElement });
          }
          selectedElement.setAttribute('aria-grabbed', 'false');
          selectedElement = null;
          announceToScreenReader('Item dropped.');
        }
        break;
        
      case 'Escape':
        // Cancel drag operation
        if (selectedElement) {
          if (handlers.onDragCancel) {
            handlers.onDragCancel({ target: selectedElement });
          }
          selectedElement.setAttribute('aria-grabbed', 'false');
          selectedElement = null;
          announceToScreenReader('Drag cancelled.');
        }
        break;
        
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Move selection or dragged item
        if (selectedElement && handlers.onKeyMove) {
          e.preventDefault();
          handlers.onKeyMove(e.key, { target: selectedElement });
        }
        break;
    }
  };
  
  element.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
};

const announceToScreenReader = (message) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
};

/**
 * Visual feedback utilities
 */
export const addDragClass = (element, className = 'dragging') => {
  element.classList.add(className);
  element.setAttribute('data-is-dragging', 'true');
};

export const removeDragClass = (element, className = 'dragging') => {
  element.classList.remove(className);
  element.setAttribute('data-is-dragging', 'false');
};

export const addDropTargetClass = (element, className = 'drop-target') => {
  element.classList.add(className);
  element.setAttribute('data-is-drop-target', 'true');
};

export const removeDropTargetClass = (element, className = 'drop-target') => {
  element.classList.remove(className);
  element.setAttribute('data-is-drop-target', 'false');
};

/**
 * Performance utilities
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Error handling utilities
 */
export const handleDragError = (error, context = 'drag operation') => {
  console.error(`Error during ${context}:`, error);
  
  // You can add error reporting here
  // reportError(error, context);
  
  // Return a user-friendly error object
  return {
    success: false,
    error: error.message || 'An unexpected error occurred',
    context,
    timestamp: Date.now()
  };
};

/**
 * Browser compatibility utilities
 */
export const getBrowserDragSupport = () => {
  const support = {
    html5DragDrop: 'draggable' in document.createElement('div'),
    dataTransfer: 'DataTransfer' in window,
    dragEvents: 'ondragstart' in document.createElement('div'),
    touchEvents: 'ontouchstart' in window,
    pointerEvents: 'onpointerdown' in window
  };
  
  return {
    ...support,
    isSupported: support.html5DragDrop && support.dataTransfer && support.dragEvents,
    recommendedFallback: !support.isSupported ? 'touch' : null
  };
};

/**
 * Utility for creating drag-enabled elements
 */
export const makeDraggable = (element, options = {}) => {
  const {
    data = {},
    onDragStart = null,
    onDragEnd = null,
    onDragOver = null,
    canDrag = () => true,
    touchSupport = false,
    keyboardSupport = false
  } = options;
  
  if (!canDrag()) return null;
  
  // Set basic draggable attributes
  element.setAttribute('draggable', 'true');
  element.style.cursor = 'grab';
  
  // HTML5 drag handlers
  const handleDragStart = (e) => {
    element.style.cursor = 'grabbing';
    addDragClass(element);
    
    // Set drag data
    Object.entries(data).forEach(([key, value]) => {
      e.dataTransfer.setData(key, value);
    });
    
    e.dataTransfer.effectAllowed = DRAG_CONSTANTS.DROP_EFFECT;
    
    if (onDragStart) onDragStart(e);
  };
  
  const handleDragEnd = (e) => {
    element.style.cursor = 'grab';
    removeDragClass(element);
    
    if (onDragEnd) onDragEnd(e);
  };
  
  const handleDragOver = (e) => {
    if (onDragOver) onDragOver(e);
  };
  
  element.addEventListener('dragstart', handleDragStart);
  element.addEventListener('dragend', handleDragEnd);
  element.addEventListener('dragover', handleDragOver);
  
  // Optional touch support
  let touchCleanup = null;
  if (touchSupport) {
    touchCleanup = addTouchSupport(element, {
      onDragStart: onDragStart,
      onDragEnd: onDragEnd
    });
  }
  
  // Optional keyboard support
  let keyboardCleanup = null;
  if (keyboardSupport) {
    keyboardCleanup = addKeyboardDragSupport(element, {
      onDragStart: onDragStart,
      onDragEnd: onDragEnd
    });
  }
  
  // Return cleanup function
  return () => {
    element.removeEventListener('dragstart', handleDragStart);
    element.removeEventListener('dragend', handleDragEnd);
    element.removeEventListener('dragover', handleDragOver);
    
    if (touchCleanup) touchCleanup();
    if (keyboardCleanup) keyboardCleanup();
    
    element.removeAttribute('draggable');
    element.style.cursor = '';
    removeDragClass(element);
  };
};