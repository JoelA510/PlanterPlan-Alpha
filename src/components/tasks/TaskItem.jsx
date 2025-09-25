import React, { useState } from 'react';

const TaskItem = ({ task, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Default expanded

  const hasChildren = task.children && task.children.length > 0;
  const indentWidth = level * 20; // 20px per level

  return (
    <div>
      {/* Main task row */}
      <div 
        className="py-2 px-4 hover:bg-gray-50 flex items-center"
        style={{ paddingLeft: `${16 + indentWidth}px` }}
      >
        {/* Expand/collapse button or spacer */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-2 text-gray-400 hover:text-gray-600 w-4 text-left"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <div className="mr-2 w-4"></div>
        )}
        
        {/* Task title */}
        <span className="text-sm text-gray-900">
          {task.title}
        </span>
      </div>

      {/* Children tasks */}
      {hasChildren && isExpanded && (
        <div>
          {task.children.map(child => (
            <TaskItem 
              key={child.id} 
              task={child} 
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskItem;