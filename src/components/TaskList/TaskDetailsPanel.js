import React from 'react';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import { formatDate } from '../../utils/taskUtils'; // Ensure this is imported

/**
 * TaskDetailsPanel - Component for displaying task details
 * @param {Object} props
 * @param {Object} props.task - The task to display details for
 * @param {Array} props.tasks - The full list of tasks
 * @param {Function} props.toggleTaskCompletion - Function to toggle task completion
 * @param {Function} props.onClose - Function to close the details panel
 * @param {Function} props.onAddChildTask - Function to add a child task
 * @param {Function} props.onDeleteTask - Function to delete the task
 */
const TaskDetailsPanel = ({
  task,
  tasks,
  toggleTaskCompletion,
  onClose,
  onAddChildTask,
  onDeleteTask
}) => {
  if (!task) return null;
  
  const level = getTaskLevel(task, tasks);
  const backgroundColor = getBackgroundColor(level);
  
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
        Completion status badge
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          backgroundColor: task.is_complete ? '#059669' : '#dc2626',
          color: 'white',
          padding: '4px 8px',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          borderBottomLeftRadius: '4px',
        }}>
          {task.is_complete ? 'Completed' : 'In Progress'}
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Checkbox commented out as requested */}
            {/* 
            <input 
              type="checkbox"
              checked={task.is_complete || false}
              onChange={(e) => toggleTaskCompletion(task.id, task.is_complete, e)}
              style={{ 
                marginRight: '12px',
                width: '18px',
                height: '18px',
                accentColor: task.is_complete ? '#059669' : undefined
              }}
            />
            */}
            <h3 style={{ 
              margin: 0, 
              fontWeight: 'bold',
              // textDecoration: task.is_complete ? 'line-through' : 'none',
              opacity: task.is_complete ? 0.8 : 1,
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
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px' }}>Status:</h4>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <p style={{ 
              display: 'inline-block',
              padding: '4px 8px',
              backgroundColor: task.is_complete ? '#dcfce7' : '#fee2e2',
              color: task.is_complete ? '#166534' : '#b91c1c',
              borderRadius: '4px',
              fontSize: '14px',
              marginTop: '4px',
              marginRight: '8px'
            }}>
              {task.is_complete ? 'Completed' : 'In Progress'}
            </p>
            
            {task.is_complete && (
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                <span style={{ color: '#059669', marginRight: '4px' }}>✓</span>
                <span>Completed on {new Date().toLocaleDateString()}</span>
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
              width: task.is_complete ? '100%' : '0%',
              backgroundColor: '#059669',
              borderRadius: '4px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Due Date:</h4>
          <p>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</p>
        </div>
        
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
            {task.actions && task.actions.length > 0 ? 
              task.actions.map((action, index) => (
                <li key={index}>{action}</li>
              )) : 
              <li>No actions specified</li>
            }
          </ul>
        </div>
        
        <div className="detail-row">
          <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Resources:</h4>
          <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
            {task.resources && task.resources.length > 0 ? 
              task.resources.map((resource, index) => (
                <li key={index}>{resource}</li>
              )) : 
              <li>No resources specified</li>
            }
          </ul>
        </div>
        
        {/* Action buttons row */}
        <div className="detail-row" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onAddChildTask(task.id)}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1
            }}
          >
            <span style={{ marginRight: '8px' }}>Add Child Task</span>
            <span>+</span>
          </button>
          
          {/* Delete button
          <button
            onClick={() => onDeleteTask(task.id)}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Delete this task and all its subtasks"
          >
            Delete
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsPanel;