import React, { useState } from 'react';

const TaskItem = ({ task, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = task.children && task.children.length > 0;
  const indentWidth = level * 24; // 24px per level for better spacing

  // Different styling for different hierarchy levels
  const getTaskStyles = () => {
    const baseClasses = "py-3 px-8 hover:bg-slate-50 transition-colors duration-150 group";
    
    if (level === 0) {
      return `${baseClasses} border-l-4 border-l-indigo-500 bg-indigo-50/30`;
    } else if (level === 1) {
      return `${baseClasses} border-l-2 border-l-slate-300`;
    } else {
      return `${baseClasses}`;
    }
  };

  const getTextStyles = () => {
    if (level === 0) {
      return "text-base font-semibold text-slate-900";
    } else if (level === 1) {
      return "text-sm font-medium text-slate-800";
    } else {
      return "text-sm text-slate-700";
    }
  };

  return (
    <div className="border-b border-gray-50 last:border-b-0">
      {/* Task row */}
      <div 
        className={getTaskStyles()}
        style={{ paddingLeft: `${32 + indentWidth}px` }}
      >
        <div className="flex items-center">
          {/* Elegant expand/collapse button */}
          {hasChildren ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mr-4 w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            >
              <svg 
                className={`w-3 h-3 text-slate-500 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-90' : ''}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <div className="mr-4 w-5 h-5 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
            </div>
          )}
          
          {/* Clean task title without badges */}
          <span className={getTextStyles()}>
            {task.title}
          </span>
        </div>
      </div>

      {/* Children with smooth reveal animation */}
      {hasChildren && isExpanded && (
        <div className="animate-fade-in">
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