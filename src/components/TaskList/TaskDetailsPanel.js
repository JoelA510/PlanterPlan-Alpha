import React, { useState, useEffect } from 'react';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import TaskForm from '../TaskForm/TaskForm';

/**
 * TaskDetailsPanel - Component for displaying task details
 * @param {Object} props
 * @param {Object} props.task - The task to display details for
 * @param {Array} props.tasks - The full list of tasks
 * @param {Function} props.toggleTaskCompletion - Function to toggle task completion
 * @param {Function} props.onClose - Function to close the details panel
 * @param {Function} props.onAddChildTask - Function to add a child task
 * @param {Function} props.onDeleteTask - Function to delete the task
 * @param {Function} props.onEditTask - Function to update the task after editing
 */
const TaskDetailsPanel = ({
  task,
  tasks,
  toggleTaskCompletion,
  onClose,
  onAddChildTask,
  onDeleteTask,
  onEditTask
}) => {
  // Use local state to track completion status
  const [isComplete, setIsComplete] = useState(task?.is_complete || false);
  // Add state for edit mode
  const [isEditing, setIsEditing] = useState(false);
  
  // Update local state when the task prop changes
  useEffect(() => {
    if (task) {
      setIsComplete(task.is_complete || false);
    }
  }, [task, task?.is_complete]);
  
  // Handle toggling completion with local state update
  const handleToggleCompletion = (e) => {
    if (task) {
      setIsComplete(!isComplete);
      toggleTaskCompletion(task.id, isComplete, e);
    }
  };

  // Handle edit button click
  const handleEditClick = () => {
    setIsEditing(true);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Handle task update
  const handleTaskUpdate = (updatedTaskData) => {
    onEditTask(task.id, updatedTaskData);
    setIsEditing(false);
  };
  
  if (!task) return null;
  
  const level = getTaskLevel(task, tasks);
  const backgroundColor = getBackgroundColor(level);

  // Find parent task for displaying parent-child relationships
  const parentTask = task.parent_task_id ? tasks.find(t => t.id === task.parent_task_id) : null;
  
  // If in edit mode, show the task form
  if (isEditing) {
    return (
      <TaskForm
        initialData={task}
        parentTaskId={task.parent_task_id}
        parentStartDate={parentTask?.start_date}
        onSubmit={handleTaskUpdate}
        onCancel={handleCancelEdit}
        backgroundColor={backgroundColor}
        originType={task.origin}
        isEditing={true}
      />
    );
  }
  
  // Ensure arrays are valid
  const actions = Array.isArray(task.actions) ? task.actions : [];
  const resources = Array.isArray(task.resources) ? task.resources : [];
  
  // Format dates for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Not set';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  return (
    <div className="task-details-panel" style={{
      backgroundColor: '#f9fafb',
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      height: '100%',
      overflow: 'auto'
    }}>
      <div className="details-header" style={{
        backgroundColor: backgroundColor,
        color: 'white',
        padding: '16px',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        position: 'relative'
      }}>
        {/* Completion status badge */}
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          backgroundColor: isComplete ? '#059669' : '#dc2626',
          color: 'white',
          padding: '4px 8px',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          borderBottomLeftRadius: '4px',
        }}>
          {isComplete ? 'Completed' : 'In Progress'}
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Checkbox to toggle completion status directly from panel */}
            <input 
              type="checkbox"
              checked={isComplete}
              onChange={handleToggleCompletion}
              style={{ 
                marginRight: '12px',
                width: '18px',
                height: '18px',
                accentColor: isComplete ? '#059669' : undefined
              }}
            />
            <h3 style={{ 
              margin: 0, 
              fontWeight: 'bold',
              textDecoration: isComplete ? 'line-through' : 'none',
              opacity: isComplete ? 0.8 : 1,
            }}>
              {task.title}
            </h3>
          </div>
          
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="details-content" style={{ padding: '16px' }}>
        {/* Status section */}
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px' }}>Status:</h4>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <p style={{ 
              display: 'inline-block',
              padding: '4px 8px',
              backgroundColor: isComplete ? '#dcfce7' : '#fee2e2',
              color: isComplete ? '#166534' : '#b91c1c',
              borderRadius: '4px',
              fontSize: '14px',
              marginTop: '4px',
              marginRight: '8px'
            }}>
              {isComplete ? 'Completed' : 'In Progress'}
            </p>
            
            {isComplete && (
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                <span style={{ color: '#059669', marginRight: '4px' }}>✓</span>
                <span>Marked as completed</span>
              </div>
            )}
          </div>
          
          <div style={{ 
            marginTop: '8px', 
            height: '8px', 
            width: '100%', 
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: isComplete ? '100%' : '0%',
              backgroundColor: '#059669',
              borderRadius: '4px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
        
        {/* Enhanced date information section */}
        <div className="date-info-section" style={{ 
          backgroundColor: '#f0f9ff', 
          borderRadius: '4px',
          padding: '12px',
          marginTop: '16px'
        }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '8px', marginTop: '0' }}>Task Schedule</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Start Date */}
            <div>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>Start Date</span>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                margin: '4px 0 0 0',
                color: task.start_date ? '#000' : '#9ca3af'
              }}>
                {task.start_date ? formatDisplayDate(task.start_date) : 'Not set'}
              </p>
            </div>
            
            {/* Due Date */}
            <div>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>Due Date</span>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                margin: '4px 0 0 0',
                color: task.due_date ? '#000' : '#9ca3af'
              }}>
                {task.due_date ? formatDisplayDate(task.due_date) : 'Not set'}
              </p>
            </div>
            
            {/* Duration */}
            <div>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>Duration</span>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                margin: '4px 0 0 0',
                color: task.default_duration ? '#000' : '#9ca3af'
              }}>
                {task.default_duration ? `${task.default_duration} day${task.default_duration !== 1 ? 's' : ''}` : 'Not set'}
              </p>
            </div>
            
            {/* Days from Parent Start */}
            {task.parent_task_id && (
              <div>
                <span style={{ fontSize: '12px', color: '#4b5563' }}>Days After Parent Start</span>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  margin: '4px 0 0 0',
                  color: task.days_from_start_until_due ? '#000' : '#9ca3af'
                }}>
                  {task.days_from_start_until_due ? `${task.days_from_start_until_due} day${task.days_from_start_until_due !== 1 ? 's' : ''}` : 'Not set'}
                </p>
              </div>
            )}
          </div>
          
          {/* Parent task name if applicable */}
          {parentTask && (
            <div style={{ marginTop: '12px', fontSize: '14px' }}>
              <span style={{ color: '#4b5563' }}>Parent Task: </span>
              <span style={{ fontWeight: 'bold' }}>{parentTask.title}</span>
            </div>
          )}
        </div>
        
        {/* Created/Modified dates */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '12px', 
          color: '#6b7280',
          marginTop: '12px'
        }}>
          {task.created_at && (
            <div>Created: {formatDisplayDate(task.created_at)}</div>
          )}
          {task.last_modified && (
            <div>Last modified: {formatDisplayDate(task.last_modified)}</div>
          )}
        </div>
        
        {/* Display license information for top-level projects */}
        {!task.parent_task_id && (
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>License:</h4>
            <p>{task.license_id ? `License ID: ${task.license_id}` : 'Free project'}</p>
          </div>
        )}
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Purpose:</h4>
          <p>{task.purpose || 'No purpose specified'}</p>
        </div>
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Description:</h4>
          <p>{task.description || 'No description specified'}</p>
        </div>
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Actions:</h4>
          <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
            {actions.length > 0 ? 
              actions.map((action, index) => (
                <li key={index}>{action}</li>
              )) : 
              <li>No actions specified</li>
            }
          </ul>
        </div>
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Resources:</h4>
          <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
            {resources.length > 0 ? 
              resources.map((resource, index) => (
                <li key={index}>{resource}</li>
              )) : 
              <li>No resources specified</li>
            }
          </ul>
        </div>
        
        {/* Action buttons */}
        <div className="detail-row" style={{ 
          marginTop: '24px', 
          display: 'flex', 
          gap: '12px'
        }}>
          {/* Edit Task Button */}
          <button
            onClick={handleEditClick}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              flex: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ marginRight: '8px' }}>Edit Task</span>
            <span>✎</span>
          </button>
          
          {/* Add Child Task button */}
          <button
            onClick={() => onAddChildTask(task.id)}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              flex: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ marginRight: '8px' }}>Add Child Task</span>
            <span>+</span>
          </button>
        </div>
        
        {/* Delete Task button - separate row */}
        <div className="detail-row" style={{ 
          marginTop: '12px'
        }}>
          <button
            onClick={() => onDeleteTask(task.id)}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Delete Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsPanel;