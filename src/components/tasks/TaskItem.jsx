import React, { useState } from 'react';

const TaskItem = ({ task, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = task.children && task.children.length > 0;
  const indentWidth = level * 24; // 24px per level for indentation

  // Get background color based on level (matching the first screenshot colors)
  const getBackgroundColor = () => {
    if (level === 0) {
      return 'bg-gray-600'; // Gray for top level projects
    } else if (level === 1) {
      return 'bg-blue-600'; // Blue for first level tasks
    } else if (level === 2) {
      return 'bg-blue-500'; // Lighter blue for second level
    } else if (level === 3) {
      return 'bg-blue-400'; // Even lighter blue for third level
    } else {
      return 'bg-blue-300'; // Lightest blue for deeper levels
    }
  };

  return (
    <>
      {/* Task card/bar */}
      <div 
        className={`task-card ${getBackgroundColor()}`}
        style={{ marginLeft: `${indentWidth}px` }}
      >
        <div className="task-card-content">
          {/* Left side - drag handle and expand/collapse */}
          <div className="task-card-left">
            <div className="drag-handle">
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <circle cx="2" cy="2" r="1" fill="currentColor"/>
                <circle cx="6" cy="2" r="1" fill="currentColor"/>
                <circle cx="2" cy="7" r="1" fill="currentColor"/>
                <circle cx="6" cy="7" r="1" fill="currentColor"/>
                <circle cx="2" cy="12" r="1" fill="currentColor"/>
                <circle cx="6" cy="12" r="1" fill="currentColor"/>
              </svg>
            </div>
            
            {hasChildren ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="expand-button"
              >
                <svg 
                  className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                  width="12" 
                  height="12" 
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <path d="M4.5 3L7.5 6L4.5 9V3Z"/>
                </svg>
              </button>
            ) : (
              <div className="expand-spacer"></div>
            )}

            {/* Status icon/checkbox */}
            {task.is_complete ? (
              <div className="status-icon completed">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10 3L4.5 8.5L2 6"/>
                </svg>
              </div>
            ) : (
              <div className="status-icon incomplete"></div>
            )}
          </div>

          {/* Task title */}
          <div className="task-card-title">
            {task.title}
          </div>

          {/* Right side - dropdown button for projects only */}
          <div className="task-card-right">
            {level === 0 && (
              <button className="dropdown-button">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 8L3 5h6l-3 3z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Render children if expanded - this will hide ALL descendants when collapsed */}
      {isExpanded && hasChildren && task.children && (
        <div className="task-children">
          {task.children.map(child => (
            <TaskItem 
              key={child.id} 
              task={child} 
              level={level + 1}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default TaskItem;