// src/components/TaskList/TaskItem.js - Updated with Tailwind CSS styling
import React, { useState } from 'react';
import { formatDisplayDate, getBackgroundColor } from '../../utils/taskUtils';
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
  // Permission props
  canEdit = true,
  canDelete = true,
  userRole = 'owner'
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const {
    getTaskStartDate,
    getTaskDueDate,
    getTaskDuration,
    isTaskOverdue,
    isTaskDueToday,
  } = useTasks();

  const [isHovering, setIsHovering] = useState(false);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const backgroundColor = getBackgroundColor(level);
  const isExpanded = expandedTasks[task.id];
  const isSelected = selectedTaskId === task.id;
  const isTopLevel = level === 0;
  const isDropTarget = dragHoverTarget?.id === task.id && !isDragging;
  const shouldShowInsertLine = isDropTarget && dragHoverTarget?.position;
  const isDragHandle = !isTopLevel && canEdit;

  // Date helpers
  const calculatedDuration = getTaskDuration(task.id);
  const calculatedDueDate = getTaskDueDate(task.id);
  const taskIsOverdue = isTaskOverdue(task.id);
  const taskIsDueToday = isTaskDueToday(task.id);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
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

  const handleToggleCompletion = async (e) => {
    e.stopPropagation();
    
    if (!canEdit) {
      alert('You do not have permission to modify this task.');
      return;
    }
    
    await toggleTaskCompletion(task.id, task.is_complete, e);
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
    
    if (!canEdit) {
      alert('You do not have permission to add tasks to this project.');
      return;
    }
    
    onAddChildTask?.(task.id);
  };

  // ============================================================================
  // STYLE CALCULATIONS
  // ============================================================================
  
  const getTaskClasses = () => {
    const baseClasses = [
      'text-white', 'p-3', 'rounded', 'flex', 'justify-between', 'items-center',
      'font-bold', 'transition-all', 'mb-0.5', 'relative'
    ];
    
    // Cursor based on drag capability
    if (isDragHandle) {
      baseClasses.push(isDragging ? 'cursor-grabbing' : 'cursor-grab');
    } else {
      baseClasses.push('cursor-pointer');
    }
    
    // Selection state
    if (isSelected) {
      baseClasses.push('ring-2', 'ring-white', 'ring-offset-2', 'mx-1');
    }
    
    // Drag states
    if (isDragging) {
      baseClasses.push('opacity-40', 'scale-105', 'rotate-1', 'z-50', 'shadow-2xl');
    } else if (isDropTarget) {
      baseClasses.push('scale-105', 'z-10', 'shadow-lg');
    } else {
      baseClasses.push('scale-100', 'z-0');
    }
    
    // Permission indicators
    if (!canEdit) {
      baseClasses.push('opacity-80', 'border-l-4', 'border-white', 'border-opacity-30');
    }
    
    return baseClasses.join(' ');
  };

  const getTaskStyle = () => {
    let style = { 
      backgroundColor,
      paddingLeft: `${12 + (level * 24)}px`
    };
    
    // Drop target highlighting
    if (isDropTarget) {
      style.backgroundColor = level === 0 ? '#4caf50' : '#9c27b0';
    }
    
    // Enhanced dragging effects
    if (isDragging) {
      style.backgroundColor = '#2196f3';
    }
    
    return style;
  };

  // ============================================================================
  // RENDER COMPONENTS
  // ============================================================================
  
  const renderDragHandle = () => {
    if (isTopLevel) return null;
    
    return (
      <span 
        className={`mr-2 text-sm transition-opacity select-none ${
          isDragHandle 
            ? (isDragging ? 'opacity-100 text-white' : (isHovering ? 'opacity-90' : 'opacity-60'))
            : 'opacity-30'
        } ${isDragging ? 'text-shadow' : ''}`}
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
    );
  };

  const renderCompletionCheckbox = () => (
    <input
      type="checkbox"
      checked={!!task.is_complete}
      onChange={handleToggleCompletion}
      onClick={(e) => e.stopPropagation()}
      disabled={!canEdit}
      className={`mr-3 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
      title={!canEdit ? "Read-only: Cannot modify completion status" : "Toggle task completion"}
    />
  );

  const renderTaskTitle = () => (
    <span className={`flex-1 mr-3 flex items-center gap-2 ${
      task.is_complete ? 'line-through opacity-70' : ''
    } ${isDragging ? 'font-bold text-shadow' : 'font-normal'}`}>
      {task.title}
      
      {!canEdit && (
        <span className="text-xs px-1.5 py-0.5 bg-white bg-opacity-20 rounded font-normal">
          READ-ONLY
        </span>
      )}
      
      {userRole && userRole !== 'owner' && canEdit && (
        <span className="text-xs px-1.5 py-0.5 bg-white bg-opacity-20 rounded font-normal uppercase">
          {userRole.replace('_', ' ')}
        </span>
      )}
      
      {isDragging && ' (moving...)'}
      {isDropTarget && ' ⬅️'}
    </span>
  );

  const renderAddChildButton = () => {
    if (!canEdit || !onAddChildTask) return null;
    
    return (
      <button
        onClick={handleAddChildClick}
        title="Add sub-task"
        className={`ml-2 mr-2 bg-white bg-opacity-25 border-none rounded-full text-white w-6 h-6 font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-white hover:bg-opacity-40 transition-opacity ${
          (isHovering && !isDragging) ? 'opacity-100' : 'opacity-0'
        }`}
      >
        +
      </button>
    );
  };

  const renderRightSection = () => (
    <div className="flex items-center gap-2">
      <div className="flex items-center text-xs">
        <span>
          {calculatedDuration} day{calculatedDuration !== 1 ? 's' : ''}
        </span>
        {hasChildren && (
          <span className="text-xs opacity-70 ml-1">
            (calc)
          </span>
        )}
      </div>
      
      {calculatedDueDate && (
        <span className={`text-xs whitespace-nowrap ${
          taskIsOverdue
            ? 'text-red-200'
            : taskIsDueToday
              ? 'text-yellow-200'
              : 'text-white text-opacity-90'
        }`}>
          Due: {formatDisplayDate(calculatedDueDate)}
          {taskIsOverdue && ' ⚠️'}
          {taskIsDueToday && ' 📅'}
        </span>
      )}
      
      {hasChildren && (
        <button
          onClick={handleExpandClick}
          title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
          className={`bg-transparent border-none text-white cursor-pointer text-base p-1 flex items-center justify-center rounded transition-colors hover:bg-white hover:bg-opacity-10 ${
            isDragging ? 'opacity-50' : 'opacity-100'
          }`}
        >
          {isExpanded ? '▼' : '►'}
        </button>
      )}

      {userRole && userRole !== 'owner' && (
        <div
          className={`w-1.5 h-1.5 rounded-full ml-1 ${
            canEdit ? 'bg-green-400 bg-opacity-80' : 'bg-yellow-400 bg-opacity-80'
          }`}
          title={canEdit ? `${userRole.replace('_', ' ')} - Can edit` : `${userRole.replace('_', ' ')} - Read only`}
        />
      )}
    </div>
  );

  const renderInsertLine = (position) => {
    if (shouldShowInsertLine !== position) return null;
    
    return (
      <div 
        className={`absolute ${position === 'above' ? '-top-0.5' : '-bottom-0.5'} h-1 bg-blue-500 rounded z-10 shadow-lg animate-pulse`}
        style={{
          left: `${12 + (level * 24)}px`,
          right: '0'
        }}
      />
    );
  };

  const renderHoverTooltip = () => {
    if (!(!canEdit && isHovering)) return null;
    
    return (
      <div 
        className="absolute top-full mt-1 bg-black bg-opacity-80 text-white p-1.5 px-2.5 rounded text-xs z-50 whitespace-nowrap"
        style={{ left: `${12 + (level * 24)}px` }}
      >
        Read-only access as {userRole?.replace('_', ' ') || 'member'}
        <div className="absolute -top-1 left-5 w-0 h-0 border-l-2 border-r-2 border-b-2 border-l-transparent border-r-transparent border-b-black border-b-opacity-80" />
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {renderInsertLine('above')}

      <div
        draggable={isDragHandle}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleTaskClick}
        className={getTaskClasses()}
        style={getTaskStyle()}
        data-task-id={task.id}
        data-is-dragging={isDragging}
        data-is-drop-target={isDropTarget}
        data-can-edit={canEdit}
        data-user-role={userRole}
      >
        <div className="flex items-center flex-1">
          {renderDragHandle()}
          {renderCompletionCheckbox()}
          {renderTaskTitle()}
          {renderAddChildButton()}
        </div>

        {renderRightSection()}
      </div>

      {renderInsertLine('below')}
      {renderHoverTooltip()}
    </div>
  );
};

export default TaskItem;