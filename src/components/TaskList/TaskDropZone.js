import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import './TaskList.css';

/**
 * TaskDropZone - Handles both "between" and "into" drop operations
 * Integrates with @dnd-kit's useDroppable for proper collision detection
 */
const TaskDropZone = ({ 
  type, // 'between' or 'into'
  parentId, 
  position, 
  isActive = false,
  className = '',
  style = {},
  children = null
}) => {
  const dropData = {
    type,
    parentId,
    position
  };

  const {
    setNodeRef,
    isOver,
    active
  } = useDroppable({
    id: `dropzone-${type}-${parentId || 'root'}-${position}`,
    data: dropData
  });

  // Determine if this drop zone should be highlighted
  const shouldHighlight = isOver && active;

  // Base styles for both types
  const baseStyle = {
    transition: 'all 0.2s ease',
    ...style
  };

  if (type === 'between') {
    return (
      <div 
        ref={setNodeRef}
        className={`task-drop-zone-between ${shouldHighlight ? 'active' : ''} ${className}`}
        style={{
          ...baseStyle,
          height: shouldHighlight ? '8px' : '4px',
          margin: '2px 0',
          borderRadius: '2px',
          backgroundColor: shouldHighlight ? '#3b82f6' : 'transparent',
          position: 'relative',
          cursor: shouldHighlight ? 'copy' : 'default',
          // Add a subtle hover area for better targeting
          minHeight: '8px',
          // Visual indicator when active
          ...(shouldHighlight && {
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
            transform: 'scaleY(1.5)'
          })
        }}
        data-drop-type="between"
        data-parent-id={parentId}
        data-position={position}
      >
        {/* Optional visual indicator */}
        {shouldHighlight && (
          <div style={{
            position: 'absolute',
            left: '12px',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '2px',
            backgroundColor: '#ffffff',
            borderRadius: '1px',
            opacity: 0.8
          }} />
        )}
        {children}
      </div>
    );
  }

  if (type === 'into') {
    return (
      <div 
        ref={setNodeRef}
        className={`task-drop-zone-into ${shouldHighlight ? 'active' : ''} ${className}`}
        style={{
          ...baseStyle,
          minHeight: shouldHighlight ? '32px' : '20px',
          margin: '4px 0 4px 24px', // Indent to show it's inside parent
          border: shouldHighlight ? '2px dashed #3b82f6' : '2px dashed #e5e7eb',
          borderRadius: '6px',
          backgroundColor: shouldHighlight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(243, 244, 246, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: shouldHighlight ? '#1e40af' : '#9ca3af',
          fontWeight: shouldHighlight ? 'bold' : 'normal',
          cursor: shouldHighlight ? 'copy' : 'default',
          // Smooth scaling effect
          ...(shouldHighlight && {
            transform: 'scale(1.02)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
          })
        }}
        data-drop-type="into"
        data-parent-id={parentId}
        data-position={position}
      >
        {/* Content that changes based on state */}
        {shouldHighlight ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            animation: 'pulse 1s ease-in-out infinite alternate'
          }}>
            <span>📂</span>
            <span>Drop here to add as child</span>
          </div>
        ) : (
          <div style={{ 
            opacity: 0.6,
            fontSize: '11px'
          }}>
            Child task area
          </div>
        )}
        {children}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div 
      ref={setNodeRef}
      className={`task-drop-zone-unknown ${className}`}
      style={{
        ...baseStyle,
        padding: '8px',
        border: '1px dashed #ef4444',
        borderRadius: '4px',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        fontSize: '12px',
        textAlign: 'center'
      }}
    >
      Unknown drop zone type: {type}
      {children}
    </div>
  );
};

/**
 * Helper component for creating multiple drop zones easily
 */
export const DropZoneGroup = ({ 
  children, 
  beforeZone = null, 
  afterZone = null, 
  intoZone = null 
}) => {
  return (
    <div className="drop-zone-group" style={{ position: 'relative' }}>
      {beforeZone}
      {children}
      {intoZone}
      {afterZone}
    </div>
  );
};

export default TaskDropZone;