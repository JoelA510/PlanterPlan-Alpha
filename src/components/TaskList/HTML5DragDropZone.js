// src/components/TaskList/HTML5DragDropZone.js
import React, { useState } from 'react';

/**
 * HTML5DragDropZone - Reusable drop zone component for task drag & drop
 * Handles both "between" and "into" drop operations with visual feedback
 * Based on our successful toy example implementation
 */
const HTML5DragDropZone = ({ 
  type, // 'between' or 'into'
  parentId, 
  position, 
  level = 0, // Indentation level for visual hierarchy
  onDropBetween, 
  onDropInto,
  isDragActive = false, // Whether any drag operation is currently active
  className = '',
  style = {},
  children = null,
  // Enhanced options
  showWhenInactive = false, // Show zone even when not dragging (for debugging)
  customColors = null, // Override default colors
  debugMode = false // Show debug information
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [dragEnterCount, setDragEnterCount] = useState(0); // Track nested drag enters

  // Enhanced drag event handlers with better event management
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragEnterCount(prev => prev + 1);
    setIsHovering(true);
    
    if (debugMode) {
      console.log(`🎯 DropZone dragEnter: ${type} at ${parentId}/${position}`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Ensure we stay in hover state
    if (!isHovering) {
      setIsHovering(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only actually leave when we've left all nested elements
    setDragEnterCount(prev => {
      const newCount = prev - 1;
      if (newCount <= 0) {
        setIsHovering(false);
        return 0;
      }
      return newCount;
    });
    
    if (debugMode && dragEnterCount <= 1) {
      console.log(`🎯 DropZone dragLeave: ${type} at ${parentId}/${position}`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    
    if (debugMode) {
      console.log(`🎯 DropZone drop: ${type} at ${parentId}/${position}`, { draggedId });
    }
    
    // Reset hover state
    setIsHovering(false);
    setDragEnterCount(0);
    
    // Call appropriate handler based on drop type
    if (type === 'between' && onDropBetween) {
      onDropBetween(draggedId, parentId, position);
    } else if (type === 'into' && onDropInto) {
      onDropInto(draggedId, parentId);
    }
  };

  // Color scheme with customization support
  const getColors = () => {
    if (customColors) return customColors;
    
    return {
      between: {
        active: '#3b82f6',      // Blue
        inactive: 'rgba(59, 130, 246, 0.3)',
        hover: '#1976d2',
        shadow: 'rgba(59, 130, 246, 0.6)'
      },
      into: {
        active: '#4caf50',      // Green  
        inactive: 'rgba(76, 175, 80, 0.3)',
        hover: '#388e3c',
        shadow: 'rgba(76, 175, 80, 0.4)'
      }
    };
  };

  const colors = getColors()[type] || getColors().between;

  // Don't render anything if drag is not active and not explicitly shown
  if (!isDragActive && !showWhenInactive) {
    return (
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ height: '2px', margin: '1px 0', ...style }}
        className={className}
      />
    );
  }

  // Render "between" drop zone
  if (type === 'between') {
    return (
      <div 
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`html5-drop-zone-between ${isHovering ? 'hovering' : ''} ${className}`}
        style={{
          height: isHovering ? '12px' : '6px',
          margin: '2px 0',
          marginLeft: `${16 + (level * 24)}px`,
          backgroundColor: isHovering ? colors.active : colors.inactive,
          borderRadius: '3px',
          transition: 'all 0.2s ease-in-out',
          border: isHovering ? `2px solid ${colors.hover}` : `1px dashed ${colors.inactive}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          color: isHovering ? 'white' : colors.hover,
          fontWeight: 'bold',
          opacity: isHovering ? 1 : 0.7,
          boxShadow: isHovering ? `0 0 8px ${colors.shadow}` : 'none',
          cursor: isHovering ? 'copy' : 'default',
          position: 'relative',
          // Enhanced hover effects
          transform: isHovering ? 'scaleY(1.5)' : 'scaleY(1)',
          // Animation for smooth transitions
          animation: isHovering ? 'pulse 1.5s ease-in-out infinite alternate' : 'none',
          ...style
        }}
        data-drop-type="between"
        data-parent-id={parentId}
        data-position={position}
        data-level={level}
      >
        {/* Visual indicator content */}
        {isHovering && (
          <>
            <span style={{ marginRight: '4px' }}>⬇️</span>
            <span>Drop here</span>
            <span style={{ marginLeft: '4px' }}>⬇️</span>
          </>
        )}
        
        {/* Debug information */}
        {debugMode && (
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '0',
            fontSize: '8px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '2px 4px',
            borderRadius: '2px',
            whiteSpace: 'nowrap'
          }}>
            between:{parentId}/{position}
          </div>
        )}
        
        {children}
      </div>
    );
  }

  // Render "into" drop zone
  if (type === 'into') {
    return (
      <div 
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`html5-drop-zone-into ${isHovering ? 'hovering' : ''} ${className}`}
        style={{
          minHeight: isHovering ? '32px' : '20px',
          margin: '4px 0',
          marginLeft: `${32 + (level * 24)}px`,
          marginRight: '8px',
          border: isHovering ? `2px dashed ${colors.active}` : `2px dashed ${colors.inactive}`,
          borderRadius: '8px',
          backgroundColor: isHovering ? `${colors.active}15` : `${colors.inactive}10`, // 15% and 10% opacity
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isHovering ? '12px' : '10px',
          color: isHovering ? colors.hover : colors.inactive,
          fontWeight: isHovering ? 'bold' : 'normal',
          transition: 'all 0.2s ease-in-out',
          boxShadow: isHovering ? `0 4px 12px ${colors.shadow}` : 'none',
          cursor: isHovering ? 'copy' : 'default',
          position: 'relative',
          // Enhanced hover effects
          transform: isHovering ? 'scale(1.02)' : 'scale(1)',
          // Subtle glow effect
          filter: isHovering ? `drop-shadow(0 0 8px ${colors.shadow})` : 'none',
          ...style
        }}
        data-drop-type="into"
        data-parent-id={parentId}
        data-position={position}
        data-level={level}
      >
        {/* Dynamic content based on hover state */}
        {isHovering ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            animation: 'pulse 1s ease-in-out infinite alternate'
          }}>
            <span>📂</span>
            <span>Drop to add as child</span>
          </div>
        ) : (
          <div style={{ 
            opacity: 0.6,
            fontSize: '11px',
            fontStyle: 'italic'
          }}>
            Child task area
          </div>
        )}
        
        {/* Debug information */}
        {debugMode && (
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '0',
            fontSize: '8px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '2px 4px',
            borderRadius: '2px',
            whiteSpace: 'nowrap'
          }}>
            into:{parentId}
          </div>
        )}
        
        {children}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div 
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`html5-drop-zone-unknown ${className}`}
      style={{
        padding: '8px',
        border: '1px dashed #ef4444',
        borderRadius: '4px',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        fontSize: '12px',
        textAlign: 'center',
        ...style
      }}
    >
      ⚠️ Unknown drop zone type: {type}
      {children}
    </div>
  );
};

/**
 * Helper component for creating multiple drop zones with consistent styling
 * Useful for complex drop zone layouts
 */
export const DropZoneGroup = ({ 
  children, 
  beforeZone = null, 
  afterZone = null, 
  intoZone = null,
  spacing = '4px'
}) => {
  return (
    <div 
      className="drop-zone-group" 
      style={{ 
        position: 'relative',
        margin: spacing
      }}
    >
      {beforeZone}
      <div style={{ position: 'relative' }}>
        {children}
        {intoZone}
      </div>
      {afterZone}
    </div>
  );
};

/**
 * Enhanced drop zone with built-in positioning logic
 * Automatically calculates spacing and hierarchy
 */
export const SmartDropZone = ({
  type,
  parentTask,
  insertIndex,
  allTasks,
  onDrop,
  isDragActive,
  debugMode = false
}) => {
  // Calculate level from parent task
  const level = parentTask ? (parentTask.level || 0) + 1 : 0;
  
  // Calculate position based on siblings
  const siblings = allTasks.filter(t => t.parent_task_id === parentTask?.id);
  const position = insertIndex;
  
  const handleDrop = (draggedId, parentId, pos) => {
    if (onDrop) {
      onDrop({
        draggedId,
        parentId,
        position: pos,
        insertIndex,
        type,
        parentTask,
        siblings
      });
    }
  };

  return (
    <HTML5DragDropZone
      type={type}
      parentId={parentTask?.id || null}
      position={position}
      level={level}
      onDropBetween={type === 'between' ? handleDrop : null}
      onDropInto={type === 'into' ? handleDrop : null}
      isDragActive={isDragActive}
      debugMode={debugMode}
    />
  );
};

export default HTML5DragDropZone;