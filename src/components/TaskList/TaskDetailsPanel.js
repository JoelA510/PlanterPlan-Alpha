import React, { useState, useEffect } from 'react';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import TaskForm from '../TaskForm/TaskForm';
import { useTasks } from '../contexts/TaskContext';

const TaskDetailsPanel = ({
  task,
  tasks,
  onClose,
  onAddTask,
  onDeleteTask,
  onEditTask
}) => {
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use the task context to get enhanced task data
  const { enhancedTasksMap = {}, loading: contextLoading, getEnhancedTask } = useTasks();

  useEffect(() => {
    // console.log(task.id);
    
    if (!contextLoading && task) {
      setIsLoading(false);
      // console.log("ENHANCED MAP", enhancedTasksMap);
    }
  }, [contextLoading, task, enhancedTasksMap]);

  // Early return if task is not defined
  if (!task) return null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="task-details-panel" style={{
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            borderTop: '3px solid #3b82f6',
            borderRight: '3px solid #3b82f6',
            borderBottom: '3px solid #e5e7eb',
            borderLeft: '3px solid #e5e7eb',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            margin: '0 auto 16px auto',
            animation: 'spin 1s linear infinite'
          }} />
          <p>Loading task details...</p>
        </div>
      </div>
    );
  }
  
  // Get enhanced properties for this task from the map
  const enhancedProps = getEnhancedTask(task.id);
  
  // Extract properties from the enhanced data
  const { hasChildren, calculatedDuration, effectiveDuration } = enhancedProps;
  
  // Button handlers
  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleTaskUpdate = (updatedTaskData) => {
    onEditTask(task.id, updatedTaskData);
    setIsEditing(false);
  };
  
  if (!task) return null;
  
  const level = getTaskLevel(task, tasks);
  const backgroundColor = getBackgroundColor(level);

  // Find parent task for displaying parent-child relationships
  const parentTask = task.parent_task_id ? tasks.find(t => t.id === task.parent_task_id) : null;
  
  // Find children for this task, sorted by position for sequential display
  const children = tasks
    .filter(t => t.parent_task_id === task.id)
    .sort((a, b) => a.position - b.position);
  
  // Edit mode
  if (isEditing) {
    return (
      <TaskForm
        initialData={task}
        parentTaskId={task.parent_task_id}
        onSubmit={handleTaskUpdate}
        onCancel={handleCancelEdit}
        backgroundColor={backgroundColor}
        isEditing={true}
        tasks={tasks}
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
  
  // Get original (stored) duration
  const storedDuration = task.duration_days || 1;
  
  // No need to calculate the actual due date - use the one from enhancedProps
  const actualDueDate = enhancedProps.calculatedDueDate || task.due_date;
  
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={{ 
              margin: 0, 
              fontWeight: 'bold',
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
        {/* Task Type Badge */}
        <div style={{ 
          display: 'inline-block',
          backgroundColor: task.origin === 'template' ? '#e0f2fe' : '#dcfce7',
          color: task.origin === 'template' ? '#0369a1' : '#166534',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '16px'
        }}>
          {task.origin === 'template' ? 'Template' : 'Task'}
        </div>
        
        {/* Enhanced schedule information section */}
        <div className="schedule-info-section" style={{ 
          backgroundColor: '#f0f9ff', 
          borderRadius: '4px',
          padding: '12px',
          marginTop: '16px'
        }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '8px', marginTop: '0' }}>Schedule Details</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Duration Display - Updated to show both durations */}
            <div>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>Duration</span>
              
              {/* If has children, show both calculated and stored durations clearly */}
              {hasChildren ? (
                <div style={{ marginTop: '4px' }}>
                  {/* Calculated Duration */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <p style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      margin: '0',
                      color: '#000'
                    }}>
                      {calculatedDuration} day{calculatedDuration !== 1 ? 's' : ''}
                    </p>
                    
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor: '#93c5fd',
                      color: '#1e40af',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      marginLeft: '6px'
                    }}>
                      CALCULATED
                    </span>
                  </div>
                  
                  {/* Stored Duration */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <p style={{ 
                      fontSize: '14px', 
                      margin: '0',
                      color: '#6b7280'
                    }}>
                      {storedDuration} day{storedDuration !== 1 ? 's' : ''} 
                    </p>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor: '#e5e7eb',
                      color: '#374151',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      marginLeft: '6px'
                    }}>
                      STORED
                    </span>
                  </div>
                </div>
              ) : (
                // For tasks without children, show just the stored duration
                <p style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  margin: '4px 0 0 0',
                  color: '#000'
                }}>
                  {storedDuration} day{storedDuration !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            {/* Position in parent */}
            <div>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>Position</span>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                margin: '4px 0 0 0'
              }}>
                { task.position !== undefined ? task.position + 1 : 'Not set'}
              </p>
            </div>
          </div>
          
          {/* Date range information */}
          <div style={{ 
            marginTop: '16px',
            display: 'flex',
            gap: '12px'
          }}>
            {/* Start date */}
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>Start Date</span>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                margin: '4px 0 0 0'
              }}>
                {formatDisplayDate(task.start_date)}
              </p>
            </div>
            
            {/* Due date - now using the pre-calculated due date from enhancedProps */}
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>Due Date</span>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                margin: '4px 0 0 0'
              }}>
                {formatDisplayDate(actualDueDate)}
              </p>
            </div>
          </div>
          
          {/* Child Tasks Timeline - sequential flow */}
          {hasChildren && (
            <div style={{ marginTop: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                Child Tasks
              </h5>
              <div style={{ 
                fontSize: '14px', 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '8px'
              }}>
                <ol style={{ 
                  margin: '0',
                  padding: '0 0 0 16px'
                }}>
                  {children.map((child, index) => {
                    // Get enhanced properties for this child from the map
                    const childEnhanced = enhancedTasksMap[child.id] || {
                      hasChildren: false,
                      calculatedDuration: child.duration_days || 1,
                      effectiveDuration: child.duration_days || 1
                    };
                    
                    // Display the appropriate duration based on whether this child has children
                    const childStoredDuration = child.duration_days || 1;
                    const displayDuration = childEnhanced.hasChildren ? 
                      childEnhanced.calculatedDuration : childStoredDuration;
                    
                    return (
                      <li key={child.id} style={{ marginBottom: '6px' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white',
                          borderRadius: '2px'
                        }}>
                          <span style={{ fontWeight: 'bold' }}>{child.title}</span>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>
                              {displayDuration} day{displayDuration !== 1 ? 's' : ''}
                            </span>
                            
                            {/* Add a badge for calculated durations */}
                            {childEnhanced.hasChildren && displayDuration !== childStoredDuration && (
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 4px',
                                backgroundColor: '#93c5fd',
                                color: '#1e40af',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                marginLeft: '4px'
                              }}>
                                CALC
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Show an arrow connecting tasks if not the last one */}
                        {index < children.length - 1 && (
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '2px 0',
                            color: '#9ca3af'
                          }}>
                            ↓
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}
          
          {/* Parent task name if applicable */}
          {parentTask && (
            <div style={{ marginTop: '12px', fontSize: '14px' }}>
              <span style={{ color: '#4b5563' }}>Parent: </span>
              <span style={{ fontWeight: 'bold' }}>{parentTask.title}</span>
            </div>
          )}
        </div>
        
        {/* Rest of the component remains unchanged */}
        {/* ... */}
        
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
        
        {/* Other task details */}
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
          {/* Edit Button */}
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
            <span style={{ marginRight: '8px' }}>Edit</span>
            <span>✎</span>
          </button>
          
          {/* Add Child button */}
          <button
            onClick={() => onAddTask(task.id)}
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
            <span style={{ marginRight: '8px' }}>Add Child</span>
            <span>+</span>
          </button>
        </div>
        
        {/* Delete button - separate row */}
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsPanel;