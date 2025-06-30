import React, { useState } from 'react';
import TaskDropZone from './TaskDropZone';
import { formatDisplayDate, getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import { updateTaskCompletion } from '../../services/taskService';
import { useTasks } from '../contexts/TaskContext';

const TaskItem = ({ 
  task,
  tasks,
  onAddChildTask,
  onDeleteTask,
  onSelectTask,
  isSelected,
  expandedTasks,
  toggleExpandTask,
  selectTask,
  selectedTaskId,
  setTasks,
  dragAndDrop,
  parentTasks = []
}) => {

  // Get date functions from context
  const { 
    getTaskStartDate, 
    getTaskDueDate, 
    getTaskDuration,
    isTaskOverdue,
    isTaskDueToday 
  } = useTasks();

  // Calculate task properties on-demand
  const hasChildren = tasks.some(t => t.parent_task_id === task.id);
  
  // Use the new date system instead of local calculations
  const getEffectiveDuration = () => {
    try {
      return getTaskDuration(task.id);
    } catch (error) {
      console.warn(`Error getting duration for task ${task.id}:`, error);
      return task.duration_days || 1;
    }
  };

  const getCalculatedDueDate = () => {
    try {
      const dueDate = getTaskDueDate(task.id);
      return dueDate ? dueDate.toISOString() : task.due_date;
    } catch (error) {
      console.warn(`Error getting due date for task ${task.id}:`, error);
      return task.due_date;
    }
  };

  const getCalculatedStartDate = () => {
    try {
      const startDate = getTaskStartDate(task.id);
      return startDate ? startDate.toISOString() : task.start_date;
    } catch (error) {
      console.warn(`Error getting start date for task ${task.id}:`, error);
      return task.start_date;
    }
  };

  // Get calculated values
  const calculatedDuration = getEffectiveDuration();
  const calculatedDueDate = getCalculatedDueDate();
  const calculatedStartDate = getCalculatedStartDate();

  // Task status helpers using new date system
  const taskIsOverdue = isTaskOverdue(task.id);
  const taskIsDueToday = isTaskDueToday(task.id);

  const [isHovering, setIsHovering] = useState(false);
  
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
  const children = tasks
    .filter(t => t.parent_task_id === task.id)
    .sort((a, b) => a.position - b.position);
  
  const level = getTaskLevel(task, tasks);
  const isTopLevel = !task.parent_task_id;
  const backgroundColor = getBackgroundColor(level);
  
  // Determine if this task is the current drop target
  const isDropTarget = dropTarget && dropTarget.id === task.id;
  const isDropTargetBefore = isDropTarget && dropPosition === 'between-before';
  const isDropTargetAfter = isDropTarget && dropPosition === 'between-after';
  const isDropTargetInto = isDropTarget && dropPosition === 'into';

  const isBeingDragged = draggedTask && draggedTask.id === task.id;

  // Helper function to ensure array type for actions and resources
  const ensureArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Create safe versions of actions and resources
  const taskActions = ensureArray(task.actions);
  const taskResources = ensureArray(task.resources);

  const toggleTaskCompletion = async (taskId, currentStatus, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      console.log("Toggling task completion:", { taskId, currentStatus });
      
      // Call the API to update the task status
      const result = await updateTaskCompletion(taskId, currentStatus);
      
      if (!result.success) throw new Error(result.error);
      
      // Create a new array with the updated task
      const updatedTasks = tasks.map(task => 
        task.id === taskId 
          ? { ...task, is_complete: !currentStatus } 
          : task
      );
      
      // Pass the array instead of a function
      setTasks(updatedTasks);
    } catch (err) {
      console.error('Error updating task completion:', err);
      alert(`Failed to update task: ${err.message}`);
    }
  };
  
  // Handle the add child task button click
  const handleAddChildButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Add child button clicked for task:", task.id);
    // Call the parent component's handler if it exists
    if (typeof onAddChildTask === 'function') {
      onAddChildTask(task.id);
    } else {
      console.error("onAddChildTask is not a function", onAddChildTask);
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
      // Add the child with the selectTask prop
      childrenWithDropZones.push(
        <TaskItem 
          key={child.id}
          task={child} 
          tasks={tasks}
          expandedTasks={expandedTasks}
          toggleExpandTask={toggleExpandTask}
          selectedTaskId={selectedTaskId}
          selectTask={selectTask}
          isSelected={selectedTaskId === child.id}
          setTasks={setTasks}
          dragAndDrop={dragAndDrop}
          onAddChildTask={onAddChildTask}
          onDeleteTask={onDeleteTask}
          onSelectTask={onSelectTask}
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
      style={{
        margin: isSelected ? '0 4px' : '0',
        transition: 'margin 0.2s ease'
      }}
    >
      {/* Task header - main draggable/droppable area */}
      <div 
        className={`task-header ${
          isDropTargetInto ? 'drop-target-into' : ''
        } ${
          isDropTargetBefore ? 'drop-target-before' : ''
        } ${
          isDropTargetAfter ? 'drop-target-after' : ''
        } ${
          isSelected ? 'selected-task' : ''
        }`}
        draggable={!isTopLevel}
        onDragStart={(e) => handleDragStart(e, task)}
        onDragOver={(e) => handleDragOver(e, task)}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        onDrop={(e) => handleDrop(e, task)}
        onClick={(e) => selectTask(task.id, e)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          backgroundColor,
          opacity: 1,
          color: 'white',
          padding: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          position: 'relative',
          cursor: isTopLevel ? 'pointer' : 'grab',
          borderRadius: '4px',
          transition: 'all 0.2s ease',
          zIndex: isSelected ? 1 : 'auto',
          borderTop: isDropTargetBefore ? '3px solid #3b82f6' : undefined,
          borderBottom: isDropTargetAfter ? '3px solid #3b82f6' : undefined,
          boxShadow: isDropTargetInto 
              ? '0 0 0 2px #3b82f6' 
              : (isSelected ? '0 0 0 2px white, 0 0 0 4px ' + backgroundColor : 'none'),
        }}  
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {!isTopLevel && (
            <span style={{ marginRight: '8px' }}>☰</span>
          )}
          <input 
            type="checkbox"
            checked={task.is_complete === true}
            onChange={(e) => toggleTaskCompletion(task.id, task.is_complete, e)}
            onClick={(e) => e.stopPropagation()}
            style={{ marginRight: '12px' }}
          />
          <span 
            style={{ 
              textDecoration: task.is_complete ? 'line-through' : 'none',
              opacity: task.is_complete ? 0.7 : 1
            }}
          >
            {task.title}
          </span>
          
          {/* Add child button that appears on hover */}
          <button 
            onClick={handleAddChildButtonClick}
            title="Add a new child task"
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '12px',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: isHovering ? 1 : 0,
              transition: 'opacity 0.2s ease'
            }}
          >
            +
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Duration display with calculation indicator */}
          <span style={{ 
            fontSize: '12px', 
            color: 'rgba(255, 255, 255, 0.9)', 
            marginRight: '8px' 
          }}>
            {calculatedDuration} day{calculatedDuration !== 1 ? 's' : ''}
            {hasChildren && (
              <span style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.7 }}>
                (calc)
              </span>
            )}
          </span>

          {/* Due date display with status indicators */}
          {calculatedDueDate && (
            <span style={{ 
              marginRight: '12px',
              fontSize: '12px',
              color: taskIsOverdue ? '#fecaca' : taskIsDueToday ? '#fde68a' : 'rgba(255, 255, 255, 0.9)'
            }}>
              Due: {formatDisplayDate(calculatedDueDate)}
              {taskIsOverdue && ' ⚠️'}
              {taskIsDueToday && ' 📅'}
            </span>
          )}
          
          {/* Info button to view details in the right panel */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              selectTask(task.id, e);
            }}
            title="View task details"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              padding: '2px 6px',
              marginRight: '8px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span style={{ marginRight: '4px' }}>
              {isSelected ? 'Selected' : 'Details'}
            </span>
            <span>ⓘ</span>
          </button>
          
          {/* Only show child tasks toggle if the task has children */}
          {hasChildren && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleExpandTask(task.id, e);
              }}
              title="Show/hide subtasks"
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0 4px',
                fontSize: '18px'
              }}
            >
              {isExpanded ? '▼' : '►'}
            </button>
          )}
        </div>
      </div>
      
      {/* Children with drop zones */}
      {childrenContent}
    </div>
  );
};

export default TaskItem;