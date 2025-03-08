import React, { useEffect, useState } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import useTaskDragAndDrop from '../utils/useTaskDragAndDrop';
import { fetchAllTasks } from '../services/taskService';
import { getBackgroundColor, getTaskLevel } from '../utils/taskUtils';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await fetchAllTasks();

      if (error) throw new Error(error);
      console.log('Fetched tasks:', data);
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(`Failed to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandTask = (taskId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
  
  // Function to select a task and show its details in the right panel
  const selectTask = (taskId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedTaskId(prevId => prevId === taskId ? null : taskId);
  };
  
  // Get the selected task object
  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  // Initialize the drag and drop functionality
  const dragAndDrop = useTaskDragAndDrop(tasks, setTasks, fetchTasks);
  
  // Render top-level tasks (projects) with spacing between them
  const renderTopLevelTasks = () => {
    const topLevelTasks = tasks
      .filter(task => !task.parent_task_id)
      .sort((a, b) => a.position - b.position);
    
    if (topLevelTasks.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#6b7280'
        }}>
          No tasks found. Create your first task to get started!
        </div>
      );
    }
    
    const taskElements = [];
    
    // Render each project with spacing between them
    topLevelTasks.forEach((task, index) => {
      // Add the task with selectTask prop instead of toggleTaskDetails
      taskElements.push(
        <TaskItem 
          key={task.id}
          task={task}
          tasks={tasks}
          expandedTasks={expandedTasks}
          toggleExpandTask={toggleExpandTask}
          selectedTaskId={selectedTaskId}
          selectTask={selectTask}
          setTasks={setTasks}
          dragAndDrop={dragAndDrop}
        />
      );
      
      // Add a spacing div after each project (except the last one)
      if (index < topLevelTasks.length - 1) {
        taskElements.push(
          <div 
            key={`project-spacer-${index}`}
            style={{
              height: '5px',
              margin: '2px 0'
            }}
          />
        );
      }
    });
    
    return taskElements;
  };
  
  // Render the details panel for the selected task
  const renderTaskDetailsPanel = () => {
    if (!selectedTask) {
      return (
        <div className="empty-details-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '4px',
          border: '1px dashed #d1d5db',
          padding: '24px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <p style={{ marginTop: '16px', textAlign: 'center' }}>
            Select a task to view its details
          </p>
        </div>
      );
    }
    
    // Get the task level and background color
    const level = getTaskLevel(selectedTask, tasks);
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
          {/* Completion status badge */}
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            backgroundColor: selectedTask.is_complete ? '#059669' : '#dc2626',
            color: 'white',
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            borderBottomLeftRadius: '4px',
          }}>
            {selectedTask.is_complete ? 'Completed' : 'In Progress'}
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
                checked={selectedTask.is_complete || false}
                onChange={(e) => {
                  const updateTaskCompletion = async () => {
                    try {
                      const result = await fetch(`/api/tasks/${selectedTask.id}/toggle-completion`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_complete: !selectedTask.is_complete })
                      });
                      
                      if (!result.ok) throw new Error('Failed to update task');
                      
                      // Update local state
                      setTasks(prev => prev.map(task => 
                        task.id === selectedTask.id 
                          ? { ...task, is_complete: !task.is_complete } 
                          : task
                      ));
                    } catch (err) {
                      console.error('Error updating task completion:', err);
                    }
                  };
                  
                  updateTaskCompletion();
                }}
                style={{ 
                  marginRight: '12px',
                  width: '18px',
                  height: '18px',
                  accentColor: selectedTask.is_complete ? '#059669' : undefined
                }}
              />
              <h3 style={{ 
                margin: 0, 
                fontWeight: 'bold',
                textDecoration: selectedTask.is_complete ? 'line-through' : 'none',
                opacity: selectedTask.is_complete ? 0.8 : 1,
              }}>
                {selectedTask.title}
              </h3>
            </div>
            
            <button 
              onClick={() => setSelectedTaskId(null)}
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
                backgroundColor: selectedTask.is_complete ? '#dcfce7' : '#fee2e2',
                color: selectedTask.is_complete ? '#166534' : '#b91c1c',
                borderRadius: '4px',
                fontSize: '14px',
                marginTop: '4px',
                marginRight: '8px'
              }}>
                {selectedTask.is_complete ? 'Completed' : 'In Progress'}
              </p>
              
              {selectedTask.is_complete && (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <span style={{ color: '#059669', marginRight: '4px' }}>✓</span>
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
                width: selectedTask.is_complete ? '100%' : '0%',
                backgroundColor: '#059669',
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Due Date:</h4>
            <p>{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No due date'}</p>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Purpose:</h4>
            <p>{selectedTask.purpose || 'No purpose specified'}</p>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Description:</h4>
            <p>{selectedTask.description || 'No description specified'}</p>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Actions:</h4>
            <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
              {selectedTask.actions && selectedTask.actions.length > 0 ? 
                selectedTask.actions.map((action, index) => (
                  <li key={index}>{action}</li>
                )) : 
                <li>No actions specified</li>
              }
            </ul>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Resources:</h4>
            <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
              {selectedTask.resources && selectedTask.resources.length > 0 ? 
                selectedTask.resources.map((resource, index) => (
                  <li key={index}>{resource}</li>
                )) : 
                <li>No resources specified</li>
              }
            </ul>
          </div>
          
          {/* Show parent path if it's a subtask */}
          {selectedTask.parent_task_id && (
            <div className="detail-row">
              <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Parent:</h4>
              <p>{getParentPath(selectedTask, tasks)}</p>
            </div>
          )}
          
          {/* Show child tasks if any */}
          {tasks.some(t => t.parent_task_id === selectedTask.id) && (
            <div className="detail-row">
              <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Child Tasks:</h4>
              <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
                {tasks
                  .filter(t => t.parent_task_id === selectedTask.id)
                  .sort((a, b) => a.position - b.position)
                  .map(task => (
                    <li key={task.id} style={{ 
                      marginBottom: '4px',
                      textDecoration: task.is_complete ? 'line-through' : 'none',
                      opacity: task.is_complete ? 0.7 : 1
                    }}>
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          selectTask(task.id);
                        }}
                        style={{ 
                          color: '#3b82f6',
                          textDecoration: 'none'
                        }}
                      >
                        {task.title}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Helper function to get parent task path
  const getParentPath = (task, allTasks) => {
    if (!task.parent_task_id) return '';
    
    const parentTask = allTasks.find(t => t.id === task.parent_task_id);
    if (!parentTask) return 'Unknown';
    
    // If the parent has a parent, recursively get the full path
    const parentPath = parentTask.parent_task_id ? 
      getParentPath(parentTask, allTasks) + ' > ' : '';
    
    return parentPath + parentTask.title;
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      {/* Left panel - Task list */}
      <div style={{ 
        flex: '1 1 60%', 
        marginRight: '24px',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Tasks</h1>
          <button 
            onClick={fetchTasks}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            Loading...
          </div>
        ) : error ? (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#b91c1c',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        ) : tasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            color: '#6b7280'
          }}>
            No tasks found. Create your first task to get started!
          </div>
        ) : (
          <div>{renderTopLevelTasks()}</div>
        )}
      </div>
      
      {/* Right panel - Task details */}
      <div style={{ 
        flex: '1 1 40%', 
        minWidth: '300px',
        maxWidth: '500px'
      }}>
        {renderTaskDetailsPanel()}
      </div>
      
      {/* Debug section */}
      <details style={{ 
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        padding: '16px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        width: '300px',
        zIndex: 100
      }}>
        <summary style={{ 
          cursor: 'pointer',
          color: '#3b82f6',
          fontWeight: '500'
        }}>
          Debug Information
        </summary>
        <div style={{ marginTop: '8px' }}>
          <p>Total tasks: {tasks.length}</p>
          <p>Top-level tasks: {tasks.filter(t => !t.parent_task_id).length}</p>
          <p>Dragging: {dragAndDrop.draggedTask ? dragAndDrop.draggedTask.title : 'None'}</p>
          <p>Drop target: {dragAndDrop.dropTarget ? `${dragAndDrop.dropTarget.title} (${dragAndDrop.dropPosition})` : 'None'}</p>
          <p>Selected task: {selectedTaskId || 'None'}</p>
          <details>
            <summary>Task Positions</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {JSON.stringify(
                tasks.map(t => ({ 
                  id: t.id, 
                  title: t.title,
                  position: t.position, 
                  parent: t.parent_task_id 
                })), 
                null, 
                2
              )}
            </pre>
          </details>
        </div>
      </details>
    </div>
  );
};

export default TaskList;