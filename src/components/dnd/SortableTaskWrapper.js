import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

export default function SortableTaskWrapper({ 
  taskId, 
  children, 
  disabled = false,
  data = null,
  task = null // Optional task object for enhanced data
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
    active
  } = useSortable({ 
    id: taskId,
    disabled,
    // Enhanced data structure for better drop zone handling
    data: data || { 
      type: 'task', 
      taskId,
      ...(task && {
        title: task.title,
        level: task.level,
        hasChildren: task.hasChildren
      })
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    // Use separate transition properties instead of shorthand + individual properties
    transitionProperty: 'transform, opacity, box-shadow',
    transitionDuration: transition ? '200ms' : '0ms',
    transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 1000 : 'auto',
  };

  // Visual feedback when being dragged over (but only for actual drop targets)
  if (isOver && active && active.id !== taskId) {
    // Only show feedback if this is a valid drop target
    // (We'll let drop zones handle most visual feedback)
    style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
    style.borderRadius = '4px';
  }

  // Enhanced drag feedback
  if (isDragging) {
    style.cursor = 'grabbing';
    style.transform = `${CSS.Transform.toString(transform)} scale(1.02)`;
    style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="sortable-task-wrapper" // For CSS targeting if needed
      data-task-id={taskId} // For debugging
      data-is-dragging={isDragging} // For CSS styling
    >
      {children}
    </div>
  );
}