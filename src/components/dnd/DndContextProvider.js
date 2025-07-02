import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// Custom collision detection that prioritizes drop zones
const customCollisionDetection = (args) => {
  const { droppableContainers, active, collisionRect } = args;
  
  // First, check for drop zone collisions (they have data.current.type)
  const dropZoneCollisions = [];
  const taskCollisions = [];
  
  droppableContainers.forEach(container => {
    const data = container.data.current;
    if (data && data.type) {
      // This is a drop zone
      dropZoneCollisions.push(container);
    } else {
      // This is a regular task
      taskCollisions.push(container);
    }
  });
  
  // Use closestCenter for drop zones first
  if (dropZoneCollisions.length > 0) {
    const dropZoneResult = closestCenter({
      ...args,
      droppableContainers: dropZoneCollisions
    });
    if (dropZoneResult.length > 0) {
      return dropZoneResult;
    }
  }
  
  // Fall back to task collisions if no drop zone hit
  if (taskCollisions.length > 0) {
    return closestCenter({
      ...args,
      droppableContainers: taskCollisions
    });
  }
  
  // Final fallback
  return closestCenter(args);
};

export default function DndContextProvider({ 
  items, 
  onDragEnd, 
  onDragStart = null,
  onDragOver = null,
  children,
  activeId = null,
  disabled = false,
  strategy = verticalListSortingStrategy,
  modifiers = [restrictToVerticalAxis]
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { 
        distance: 8 // Slightly higher to prevent accidental drags
      } 
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Enhanced drag start handler
  const handleDragStart = (event) => {
    if (onDragStart) {
      onDragStart(event);
    }
  };

  // Enhanced drag over handler for drop zone feedback
  const handleDragOver = (event) => {
    if (onDragOver) {
      onDragOver(event);
    }
  };

  // Enhanced drag end handler
  const handleDragEnd = (event) => {
    if (onDragEnd) {
      onDragEnd(event);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection} // Use our custom collision detection
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={modifiers}
    >
      <SortableContext 
        items={items} 
        strategy={strategy}
        disabled={disabled}
      >
        {children}
      </SortableContext>
      
      {/* Enhanced drag overlay with better feedback */}
      <DragOverlay>
        {activeId ? (
          <div style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '6px',
            fontWeight: 'bold',
            opacity: 0.9,
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            transform: 'rotate(2deg)',
            border: '2px solid rgba(255,255,255,0.3)',
            fontSize: '14px',
            maxWidth: '250px',
            textAlign: 'center'
          }}>
            📋 Moving task...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}