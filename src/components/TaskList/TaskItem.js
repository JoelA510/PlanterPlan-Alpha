// src/components/TaskList/TaskItem.js
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

  // Date helpers
  const calculatedDuration = getTaskDuration(task.id);
  const calculatedDueDate = getTaskDueDate(task.id);
  const taskIsOverdue = isTaskOverdue(task.id);
  const taskIsDueToday = isTaskDueToday(task.id);

  // Toggle completion handler
  const handleToggleCompletion = async (e) => {
    e.stopPropagation();
    await toggleTaskCompletion(task.id, task.is_complete, e);
  };

  // Generate style based on state and level
  const getTaskStyle = () => {
    return {
      backgroundColor,
      color: '#fff',
      padding: 12,
      paddingLeft: 12 + (level * 24), // Indent based on level
      borderRadius: 4,
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: 'bold',
      boxShadow: isSelected
        ? `0 0 0 2px #fff, 0 0 0 4px ${backgroundColor}`
        : 'none',
      transition: 'all 0.2s ease',
      margin: isSelected ? '0 4px' : 0,
      position: 'relative',
      marginBottom: '2px',
    };
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
      {/* Task Header */}
      <div
        onClick={handleTaskClick}
        style={getTaskStyle()}
        className="task-item" // For CSS styling if needed
      >
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {/* Drag handle for non-top-level tasks */}
          {!isTopLevel && (
            <span 
              style={{ 
                marginRight: 8, 
                cursor: 'grab',
                opacity: 0.7,
                fontSize: '14px'
              }}
              title="Drag to reorder"
            >
              ☰
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
              marginRight: 12
            }}
          >
            {task.title}
          </span>
          
          {/* Quick add-child button */}
          <button
            onClick={handleAddChildClick}
            title="Add sub-task"
            style={{
              marginLeft: 8,
              marginRight: 8,
              opacity: isHovering ? 1 : 0,
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
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
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
    </div>
  );
};

export default TaskItem;