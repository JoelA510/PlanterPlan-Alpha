import React from 'react';
import './TaskList.css'; // Make sure the CSS is accessible

const TaskDropZone = ({ parentId, position, prevTask, nextTask, 
                       draggedTask, onDragOver, onDragLeave, onDrop, isActive }) => {
  return (
    <div 
      className={`task-drop-zone ${isActive ? 'active' : ''}`}
      onDragOver={(e) => onDragOver(e, parentId, position, prevTask, nextTask)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, parentId, position)}
    >
      <div className="indicator"></div>
    </div>
  );
};

export default TaskDropZone;