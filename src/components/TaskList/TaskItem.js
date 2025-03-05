import React from 'react';
import TaskDropZone from './TaskDropZone';
import { formatDate, getBackgroundColor, getTaskLevel } from '../utils/taskUtils';
import { updateTaskCompletion } from '../services/taskService';

const TaskItem = ({ 
  task, 
  tasks, 
  expandedTasks, 
  toggleExpandTask, 
  setTasks,
  dragAndDrop,
  parentTasks = []
}) => {
  const { 
    draggedTask, 
    dropTarget, 
    dropPosition,
    handleDragStart, 
    handleDragOver, 
    handleDragLeave, 
    handleDragEnd,
    handleDrop,
    handleDropZoneDragOver,
    handleDropZoneDragLeave,
    handleDropZoneDrop,
    isDropZoneActive
  } = dragAndDrop;

  const isExpanded = expandedTasks[task.id];
  const hasChildren = tasks.some(t => t.parent_task_id === task.id);
  const children = tasks
    .filter(t => t.parent_task_id === task.id)
    .sort((a, b) => a.position - b.position);
  
  const level = getTaskLevel(task, tasks);
  const isTopLevel = !task.parent_task_id;
  const backgroundColor = getBackgroundColor(level);
  
  // Determine if this task is the current drop target
  const isDropTarget = dropTarget && dropTarget.id === task.id;
  const isBeingDragged = draggedTask && draggedTask.id === task.id;

  const toggleTaskCompletion = async (taskId, currentStatus, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const result = await updateTaskCompletion(taskId, currentStatus);
      
      if (!result.success) throw new Error(result.error);
      
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, is_complete: !currentStatus } 
            : task
        )
      );
    } catch (err) {
      console.error('Error updating task completion:', err);
      alert(`Failed to update task: ${err.message}`);
    }
  };
  
  // Render children with drop zones
  let childrenContent = null;
  
  if (isExpanded && hasChildren) {
    const childrenWithDropZones = [];
    
    // Add a drop zone at the beginning (position 0)
    childrenWithDropZones.push(
      <TaskDropZone 
        key={`dropzone-${task.id}-0`}
        parentId={task.id}
        position={0}
        prevTask={null}
        nextTask={children[0]}
        draggedTask={draggedTask}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
        isActive={isDropZoneActive(task.id, 0)}
      />
    );
    
    // Add children with drop zones between them
    children.forEach((child, index) => {
      // Add the child
      childrenWithDropZones.push(
        <TaskItem 
          key={child.id}
          task={child} 
          tasks={tasks}
          expandedTasks={expandedTasks}
          toggleExpandTask={toggleExpandTask}
          setTasks={setTasks}
          dragAndDrop={dragAndDrop}
          parentTasks={[...parentTasks, task]}
        />
      );
      
      // Add a drop zone after the child (if not the last child)
      if (index < children.length - 1) {
        childrenWithDropZones.push(
          <TaskDropZone 
            key={`dropzone-${task.id}-${index + 1}`}
            parentId={task.id}
            position={index + 1}
            prevTask={child}
            nextTask={children[index + 1]}
            draggedTask={draggedTask}
            onDragOver={handleDropZoneDragOver}
            onDragLeave={handleDropZoneDragLeave}
            onDrop={handleDropZoneDrop}
            isActive={isDropZoneActive(task.id, index + 1)}
          />
        );
      }
    });
    
    // Add a final drop zone at the end
    childrenWithDropZones.push(
      <TaskDropZone 
        key={`dropzone-${task.id}-${children.length}`}
        parentId={task.id}
        position={children.length}
        prevTask={children[children.length - 1]}
        nextTask={null}
        draggedTask={draggedTask}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
        isActive={isDropZoneActive(task.id, children.length)}
      />
    );
    
    childrenContent = (
      <div style={{ 
        paddingLeft: '24px',
        paddingTop: '0'
      }}>
        {childrenWithDropZones}
      </div>
    );
  }
  
  return (
    <div 
      key={task.id}
      id={`task-${task.id}`}
      className={`task-container ${isBeingDragged ? 'being-dragged' : ''}`}
    >
      {/* Task header - main draggable/droppable area */}
      <div 
        className={`task-header ${isDropTarget && dropPosition === 'into' ? 'drop-target-into' : ''}`}
        draggable={!isTopLevel}
        onDragStart={(e) => handleDragStart(e, task)}
        onDragOver={(e) => handleDragOver(e, task)}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        onDrop={(e) => handleDrop(e, task)}
        style={{
          backgroundColor,
          color: 'white',
          padding: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          position: 'relative',
          cursor: isTopLevel ? 'default' : 'grab',
          borderRadius: '4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {!isTopLevel && (
            <span style={{ marginRight: '8px' }}>☰</span>
          )}
          <input 
            type="checkbox"
            checked={task.is_complete || false}
            onChange={(e) => toggleTaskCompletion(task.id, task.is_complete, e)}
            style={{ marginRight: '12px' }}
          />
          <span style={{ 
            textDecoration: task.is_complete ? 'line-through' : 'none',
            opacity: task.is_complete ? 0.7 : 1
          }}>
            {task.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '12px' }}>Due: {formatDate(task.due_date)}</span>
          <button 
            onClick={(e) => toggleExpandTask(task.id, e)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0 4px'
            }}
          >
            {isExpanded ? '▼' : '►'}
          </button>
        </div>
      </div>
      
      {/* Children with drop zones */}
      {childrenContent}
    </div>
  );
};

export default TaskItem;