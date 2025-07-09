// src/components/TaskList/TaskItem.js - Enhanced with permission handling
import React, { useState } from 'react';
import {
  formatDisplayDate,
  getBackgroundColor,
} from '../../utils/taskUtils';
import { useTasks } from '../contexts/TaskContext';

const TaskItem = ({
  task,
  tasks,
  level = 0,
  expandedTasks,
  toggleExpandTask,
  selectedTaskId,
  selectTask,
  onAddChildTask,
  hasChildren = false,
  toggleTaskCompletion,
  // HTML5 drag & drop props
  isDragging = false,
  dragHoverTarget = null,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  // ✅ NEW: Permission props
  canEdit = true,
  canDelete = true,
  userRole = 'owner'
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

  // ✅ ENHANCED: Drag state calculations with permission check
  const isDropTarget = dragHoverTarget?.id === task.id && !isDragging;
  const shouldShowInsertLine = isDropTarget && dragHoverTarget?.position;
  const isDragHandle = !isTopLevel && canEdit; // Only allow dragging if user can edit

  // Date helpers
  const calculatedDuration = getTaskDuration(task.id);
  const calculatedDueDate = getTaskDueDate(task.id);
  const taskIsOverdue = isTaskOverdue(task.id);
  const taskIsDueToday = isTaskDueToday(task.id);

  // ✅ ENHANCED: HTML5 Drag Event Handlers with permission check
  const handleDragStart = (e) => {
    if (isTopLevel || !canEdit) {
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

  // ✅ ENHANCED: Toggle completion handler with permission check
  const handleToggleCompletion = async (e) => {
    e.stopPropagation();
    
    if (!canEdit) {
      alert('You do not have permission to modify this task.');
      return;
    }
    
    await toggleTaskCompletion(task.id, task.is_complete, e);
  };

  // ✅ ENHANCED: Generate style with drag feedback and permission indicators
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
      // Drag visual feedback
      opacity: isDragging ? 0.4 : 1,
      transform: isDragging ? 'scale(1.02) rotate(1deg)' : isDropTarget ? 'scale(1.01)' : 'scale(1)',
      zIndex: isDragging ? 1000 : isDropTarget ? 5 : 1,
    };

    // ✅ NEW: Visual indicator for read-only tasks
    if (!canEdit) {
      baseStyle.opacity = 0.8;
      baseStyle.borderLeft = '4px solid rgba(255, 255, 255, 0.3)';
    }

    // Drop target highlighting
    if (isDropTarget) {
      baseStyle.backgroundColor = level === 0 ? '#4caf50' : '#9c27b0';
      baseStyle.boxShadow = `0 4px 12px rgba(156, 39, 176, 0.3)`;
    }

    // Enhanced dragging effects
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

  // ✅ ENHANCED: Add child click with permission check
  const handleAddChildClick = (e) => {
    e.stopPropagation();
    
    if (!canEdit) {
      alert('You do not have permission to add tasks to this project.');
      return;
    }
    
    onAddChildTask?.(task.id);
  };

  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Insert line above for drop targeting */}
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
        // HTML5 drag attributes
        draggable={isDragHandle}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleTaskClick}
        style={getTaskStyle()}
        className="task-item"
        data-task-id={task.id}
        data-is-dragging={isDragging}
        data-is-drop-target={isDropTarget}
        data-can-edit={canEdit}
        data-user-role={userRole}
      >
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {/* ✅ ENHANCED: Drag handle with permission check */}
          {!isTopLevel && (
            <span 
              style={{ 
                marginRight: 8, 
                cursor: isDragHandle ? (isDragging ? 'grabbing' : 'grab') : 'not-allowed',
                opacity: isDragHandle ? (isDragging ? 1 : (isHovering ? 0.9 : 0.6)) : 0.3,
                fontSize: '14px',
                transition: 'opacity 0.2s ease',
                color: isDragging ? '#fff' : isDropTarget ? '#fff' : 'rgba(255,255,255,0.8)',
                textShadow: isDragging ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
              }}
              title={
                !canEdit 
                  ? "Read-only: Cannot reorder" 
                  : isDragging 
                    ? "Dragging..." 
                    : "Drag to reorder"
              }
            >
              {canEdit ? '⋮⋮' : '○○'}
            </span>
          )}
          
          {/* ✅ ENHANCED: Completion checkbox with permission check */}
          <input
            type="checkbox"
            checked={!!task.is_complete}
            onChange={handleToggleCompletion}
            onClick={(e) => e.stopPropagation()}
            disabled={!canEdit}
            style={{ 
              marginRight: 12,
              cursor: canEdit ? 'pointer' : 'not-allowed',
              opacity: canEdit ? 1 : 0.5
            }}
            title={!canEdit ? "Read-only: Cannot modify completion status" : "Toggle task completion"}
          />
          
          {/* Task title with permission indicators */}
          <span
            style={{
              textDecoration: task.is_complete ? 'line-through' : 'none',
              opacity: task.is_complete ? 0.7 : 1,
              flex: 1,
              marginRight: 12,
              fontWeight: isDragging ? 'bold' : 'normal',
              textShadow: isDragging ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {task.title}
            {/* ✅ NEW: Permission indicator */}
            {!canEdit && (
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontWeight: 'normal'
              }}>
                READ-ONLY
              </span>
            )}
            {/* ✅ NEW: User role indicator for non-owners */}
            {userRole && userRole !== 'owner' && canEdit && (
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontWeight: 'normal',
                textTransform: 'uppercase'
              }}>
                {userRole.replace('_', ' ')}
              </span>
            )}
            {/* Drag state indicators */}
            {isDragging && ' (moving...)'}
            {isDropTarget && ' ⬅️'}
          </span>
          
          {/* ✅ ENHANCED: Quick add-child button with permission check */}
          {canEdit && onAddChildTask && (
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
          )}
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

          {/* ✅ NEW: Permission level indicator (subtle) */}
          {userRole && userRole !== 'owner' && (
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: canEdit ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 193, 7, 0.8)',
                marginLeft: '4px'
              }}
              title={canEdit ? `${userRole.replace('_', ' ')} - Can edit` : `${userRole.replace('_', ' ')} - Read only`}
            />
          )}
        </div>
      </div>

      {/* Insert line below for drop targeting */}
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

      {/* ✅ NEW: Hover tooltip for permission info */}
      {!canEdit && isHovering && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: `${12 + (level * 24)}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          marginTop: '4px'
        }}>
          Read-only access as {userRole?.replace('_', ' ') || 'member'}
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: '20px',
            width: '0',
            height: '0',
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: '4px solid rgba(0, 0, 0, 0.8)'
          }} />
        </div>
      )}
    </div>
  );
};

export default TaskItem;