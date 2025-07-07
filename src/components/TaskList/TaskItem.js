// src/components/TaskList/TaskItem.js - MIGRATED TO HTML5 DRAG & DROP
import React, { useState } from 'react';
import {
  formatDisplayDate,
  getBackgroundColor,
} from '../../utils/taskUtils';
import { useTasks } from '../contexts/TaskContext';

const TaskItem = ({
  task,
  tasks,
  level = 0, // Now passed from parent instead of calculated
  expandedTasks,
  toggleExpandTask,
  selectedTaskId,
  selectTask,
  onAddChildTask,
  hasChildren = false, // Now passed from parent
  toggleTaskCompletion,
  // ✅ NEW: HTML5 drag & drop props
  isDragging = false,
  dragHoverTarget = null,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) => {
  const {
    getTaskStartDate,
    getTaskDueDate,
    getTaskDuration,
    isTaskOverdue,
    isTaskDueToday,
  } = useTasks();

  const [isHovering, setIsHovering] = useState(false);
  
  const backgroundColor = getBackgroundColor(level);
  const isExpanded = expandedTasks[task.id];
  const isSelected = selectedTaskId === task.id;
  const isTopLevel = level === 0;

  // ✅ NEW: Drag state calculations
  const isDropTarget = dragHoverTarget?.id === task.id && !isDragging;
  const shouldShowInsertLine = isDropTarget && dragHoverTarget?.position;
  const isDragHandle = !isTopLevel; // Only non-top-level tasks can be dragged

  // Date helpers
  const calculatedDuration = getTaskDuration(task.id);
  const calculatedDueDate = getTaskDueDate(task.id);
  const taskIsOverdue = isTaskOverdue(task.id);
  const taskIsDueToday = isTaskDueToday(task.id);

  // ✅ NEW: HTML5 Drag Event Handlers
  const handleDragStart = (e) => {
    if (isTopLevel) {
      e.preventDefault();
      return;
    }
    
    console.log('🎯 TaskItem drag start:', task.title);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    
    if (onDragStart) {
      const success = onDragStart(task);
      if (!success) {
        e.preventDefault();
      }
    }
  };

  const handleDragEnd = (e) => {
    console.log('🎯 TaskItem drag end:', task.title);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (onDragOver) {
      onDragOver(task, 'enter');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (onDragOver) {
      onDragOver(task, 'over');
    }
  };

  const handleDragLeave = (e) => {
    // Only trigger if we're actually leaving this element (not a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (onDragOver) {
        onDragOver(null, 'leave');
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    console.log('🎯 TaskItem drop:', { draggedId, targetId: task.id });
    
    if (onDrop && draggedId !== task.id) {
      onDrop(draggedId, task.id);
    }
  };

  // Toggle completion handler
  const handleToggleCompletion = async (e) => {
    e.stopPropagation();
    await toggleTaskCompletion(task.id, task.is_complete, e);
  };

  // ✅ ENHANCED: Generate style with drag feedback
  const getTaskStyle = () => {
    let baseStyle = {
      backgroundColor,
      color: '#fff',
      padding: 12,
      paddingLeft: 12 + (level * 24), // Indent based on level
      borderRadius: 4,
      cursor: isDragHandle ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: 'bold',
      boxShadow: isSelected
        ? `0 0 0 2px #fff, 0 0 0 4px ${backgroundColor}`
        : 'none',
      transition: isDragging ? 'none' : 'all 0.2s ease',
      margin: isSelected ? '0 4px' : 0,
      position: 'relative',
      marginBottom: '2px',
      // ✅ NEW: Drag visual feedback
      opacity: isDragging ? 0.4 : 1,
      transform: isDragging ? 'scale(1.02) rotate(1deg)' : isDropTarget ? 'scale(1.01)' : 'scale(1)',
      zIndex: isDragging ? 1000 : isDropTarget ? 5 : 1,
    };

    // ✅ NEW: Drop target highlighting
    if (isDropTarget) {
      baseStyle.backgroundColor = level === 0 ? '#4caf50' : '#9c27b0'; // Green for containers, purple for reordering
      baseStyle.boxShadow = `0 4px 12px rgba(156, 39, 176, 0.3)`;
    }

    // ✅ NEW: Enhanced dragging effects
    if (isDragging) {
      baseStyle.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
      baseStyle.backgroundColor = '#2196f3';
    }

    return baseStyle;
  };

  const handleTaskClick = (e) => {
    selectTask(task.id, e);
  };

  const handleExpandClick = (e) => {
    e.stopPropagation();
    toggleExpandTask(task.id, e);
  };

  const handleAddChildClick = (e) => {
    e.stopPropagation();
    onAddChildTask?.(task.id);
  };

  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* ✅ NEW: Insert line above for drop targeting */}
      {shouldShowInsertLine === 'above' && (
        <div style={{
          position: 'absolute',
          top: '-2px',
          left: `${12 + (level * 24)}px`,
          right: '0',
          height: '4px',
          backgroundColor: '#2196f3',
          borderRadius: '2px',
          zIndex: 10,
          boxShadow: '0 0 8px rgba(33, 150, 243, 0.6)',
          animation: 'pulse 1s ease-in-out infinite alternate'
        }} />
      )}

      {/* Task Header */}
      <div
        // ✅ NEW: HTML5 drag attributes
        draggable={isDragHandle}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleTaskClick}
        style={getTaskStyle()}
        className="task-item" // For CSS styling if needed
        data-task-id={task.id} // For debugging
        data-is-dragging={isDragging}
        data-is-drop-target={isDropTarget}
      >
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {/* ✅ ENHANCED: Drag handle for non-top-level tasks */}
          {!isTopLevel && (
            <span 
              style={{ 
                marginRight: 8, 
                cursor: isDragging ? 'grabbing' : 'grab',
                opacity: isDragging ? 1 : (isHovering ? 0.9 : 0.6),
                fontSize: '14px',
                transition: 'opacity 0.2s ease',
                color: isDragging ? '#fff' : isDropTarget ? '#fff' : 'rgba(255,255,255,0.8)',
                textShadow: isDragging ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
              }}
              title={isDragging ? "Dragging..." : "Drag to reorder"}
            >
              ⋮⋮
            </span>
          )}
          
          {/* Completion checkbox */}
          <input
            type="checkbox"
            checked={!!task.is_complete}
            onChange={handleToggleCompletion}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              marginRight: 12,
              cursor: 'pointer'
            }}
          />
          
          {/* Task title */}
          <span
            style={{
              textDecoration: task.is_complete ? 'line-through' : 'none',
              opacity: task.is_complete ? 0.7 : 1,
              flex: 1,
              marginRight: 12,
              // ✅ NEW: Enhanced text during drag
              fontWeight: isDragging ? 'bold' : 'normal',
              textShadow: isDragging ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            {task.title}
            {/* ✅ NEW: Drag state indicators */}
            {isDragging && ' (moving...)'}
            {isDropTarget && ' ⬅️'}
          </span>
          
          {/* Quick add-child button */}
          <button
            onClick={handleAddChildClick}
            title="Add sub-task"
            style={{
              marginLeft: 8,
              marginRight: 8,
              opacity: (isHovering && !isDragging) ? 1 : 0,
              transition: 'opacity .2s',
              background: 'rgba(255,255,255,.25)',
              border: 'none',
              borderRadius: '50%',
              width: 24,
              height: 24,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            +
          </button>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Duration display */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 12 }}>
            <span>
              {calculatedDuration} day{calculatedDuration !== 1 && 's'}
            </span>
            {hasChildren && (
              <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
                (calc)
              </span>
            )}
          </div>
          
          {/* Due date with status indicators */}
          {calculatedDueDate && (
            <span
              style={{
                fontSize: 12,
                color: taskIsOverdue
                  ? '#fecaca'
                  : taskIsDueToday
                  ? '#fde68a'
                  : 'rgba(255,255,255,.9)',
                whiteSpace: 'nowrap'
              }}
            >
              Due: {formatDisplayDate(calculatedDueDate)}
              {taskIsOverdue && ' ⚠️'}
              {taskIsDueToday && ' 📅'}
            </span>
          )}
          
          {/* Expand/collapse button for tasks with children */}
          {hasChildren && (
            <button
              onClick={handleExpandClick}
              title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 16,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'background-color 0.2s ease',
                opacity: isDragging ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {isExpanded ? '▼' : '►'}
            </button>
          )}
        </div>
      </div>

      {/* ✅ NEW: Insert line below for drop targeting */}
      {shouldShowInsertLine === 'below' && (
        <div style={{
          position: 'absolute',
          bottom: '-2px',
          left: `${12 + (level * 24)}px`,
          right: '0',
          height: '4px',
          backgroundColor: '#2196f3',
          borderRadius: '2px',
          zIndex: 10,
          boxShadow: '0 0 8px rgba(33, 150, 243, 0.6)',
          animation: 'pulse 1s ease-in-out infinite alternate'
        }} />
      )}
    </div>
  );
};

export default TaskItem;