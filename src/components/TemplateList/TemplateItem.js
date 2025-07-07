// src/components/TemplateList/TemplateItem.js - FIXED VERSION
import React, { useState } from 'react';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';

const TemplateItem = ({ 
  task, 
  tasks, 
  expandedTasks, 
  toggleExpandTask, 
  selectedTaskId,
  selectTask,
  setTasks,
  dragAndDrop,
  onAddTask,
  parentTasks = []
}) => {
  const [isHovering, setIsHovering] = useState(false);
  
  // ✅ FIXED: Extract drag and drop handlers (if provided)
  const {
    draggedTask,
    dropTarget,
    dropPosition,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    // Remove references to drop zone handlers that don't exist
  } = dragAndDrop || {};

  const isExpanded = expandedTasks[task.id];
  const isSelected = selectedTaskId === task.id;
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
  
  // ✅ FIXED: Simplified children rendering without drop zones
  let childrenContent = null;
  
  if (isExpanded && hasChildren) {
    childrenContent = (
      <div style={{ 
        paddingLeft: '24px',
        paddingTop: '0'
      }}>
        {children.map((child) => (
          <TemplateItem 
            key={child.id}
            task={child} 
            tasks={tasks}
            expandedTasks={expandedTasks}
            toggleExpandTask={toggleExpandTask}
            selectedTaskId={selectedTaskId}
            selectTask={selectTask}
            setTasks={setTasks}
            dragAndDrop={dragAndDrop}
            onAddTask={onAddTask}
            parentTasks={[...parentTasks, task]}
          />
        ))}
      </div>
    );
  }
  
  return (
    <div 
      key={task.id}
      id={`template-${task.id}`}
      className={`task-container ${isBeingDragged ? 'being-dragged' : ''}`}
      style={{
        margin: isSelected ? '0 4px' : '0',
        marginBottom: '4px', // Add spacing between templates
        transition: 'margin 0.2s ease'
      }}
    >
      {/* Template header - main draggable/droppable area */}
      <div 
        className={`task-header ${isDropTarget && dropPosition === 'into' ? 'drop-target-into' : ''} ${isSelected ? 'selected-template' : ''}`}
        draggable={!isTopLevel}
        onDragStart={handleDragStart ? (e) => handleDragStart(e, task) : undefined}
        onDragOver={handleDragOver ? (e) => handleDragOver(e, task) : undefined}
        onDragLeave={handleDragLeave || undefined}
        onDragEnd={handleDragEnd || undefined}
        onDrop={handleDrop ? (e) => handleDrop(e, task) : undefined}
        onClick={(e) => selectTask(task.id, e)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          backgroundColor,
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
          boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px ' + backgroundColor : 'none',
          zIndex: isSelected ? 1 : 'auto',
          // ✅ FIXED: Add visual feedback for drag states
          opacity: isBeingDragged ? 0.5 : 1,
          transform: isDropTarget ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {!isTopLevel && (
            <span style={{ 
              marginRight: '8px',
              opacity: isHovering ? 0.9 : 0.6,
              transition: 'opacity 0.2s ease'
            }}>
              ☰
            </span>
          )}
          <span>
            {task.title}
          </span>
          
          {/* Hidden plus button that appears on hover */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddTask(task.id, e);
            }}
            title="Add a new task to this template"
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
          {/* Duration display */}
          <div style={{ 
            fontSize: '12px', 
            marginRight: '8px',
            opacity: 0.8
          }}>
            {task.duration_days || task.default_duration || 1} day{(task.duration_days || task.default_duration || 1) !== 1 ? 's' : ''}
          </div>
          
          {/* Info button to view details in the right panel */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              selectTask(task.id, e);
            }}
            title="View template details"
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
          
          {/* Only show child templates toggle if the template has children */}
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
      
      {/* ✅ FIXED: Visual feedback for drop states */}
      {isDropTarget && dropPosition === 'into' && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '24px',
          right: '8px',
          height: '2px',
          backgroundColor: '#10b981',
          borderRadius: '1px',
          zIndex: 5,
          boxShadow: '0 0 4px rgba(16, 185, 129, 0.6)'
        }} />
      )}
      
      {/* Children content */}
      {childrenContent}
    </div>
  );
};

export default TemplateItem;