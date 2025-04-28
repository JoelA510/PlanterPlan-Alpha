// src/components/TaskList/TaskList.js
import React, { useState, useEffect, useRef } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import TaskDropZone from './TaskDropZone';
import TaskForm from '../TaskForm/TaskForm';
import NewProjectForm from '../TaskForm/NewProjectForm';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import { updateTaskCompletion } from '../../services/taskService';

const TaskList = () => {
  const { user } = useAuth();
  // Initialize refs first 
  const isMountedRef = useRef(true);
  const initialFetchDoneRef = useRef(false);
  
  const { 
    instanceTasks: tasks, 
    loading, 
    initialLoading, 
    error, 
    fetchTasks, 
    setTasks,
    createTask,
    canCreateProject,
    projectLimitReason,
    userLicenses,
    selectedLicenseId,
    isCheckingLicense,
    applyLicenseKey,
    selectLicense,
    fetchUserLicenses,
    getSelectedLicense
  } = useTasks();
  
  // Local state
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [addingChildToTaskId, setAddingChildToTaskId] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    // Only fetch on initial mount to avoid redundant fetches
    // since the context already handles automatic fetching
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true; // Mark as done immediately to prevent loops
    }
    
    return () => { isMountedRef.current = false; };
  }, []);

  // Toggle task expansion
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
    // Cancel adding a child task if the user clicks on a different task
    if (addingChildToTaskId && addingChildToTaskId !== taskId) {
      setAddingChildToTaskId(null);
    }
    setSelectedTaskId(prevId => prevId === taskId ? null : taskId);
  };
  
  // Get the selected task object
  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  // Initialize the drag and drop functionality
  const dragAndDrop = useTaskDragAndDrop(tasks, setTasks, fetchTasks);
  
  // Handle task completion toggle
  const toggleTaskCompletion = async (taskId, currentStatus, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const result = await updateTaskCompletion(taskId, currentStatus);
      
      if (!result.success) throw new Error(result.error);
      
      if (isMountedRef.current) {
        setTasks(prev => 
          prev.map(task => 
            task.id === taskId 
              ? { ...task, is_complete: !currentStatus } 
              : task
          )
        );
      }
    } catch (err) {
      console.error('Error updating task completion:', err);
      if (isMountedRef.current) {
        alert(`Failed to update task: ${err.message}`);
      }
    }
  };

  // State for license key dialog
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseError, setLicenseError] = useState(null);
  const [isApplyingLicense, setIsApplyingLicense] = useState(false);
  
  // Function to handle creating a new project
  const handleCreateNewProject = () => {
    // If user can't create a project, show license dialog instead
    if (!canCreateProject) {
      setShowLicenseDialog(true);
      return;
    }
    
    // Prevent multiple clicks
    if (isCreatingProject) return;
    
    setIsCreatingProject(true);
    setSelectedTaskId(null);
    setAddingChildToTaskId(null);
  };

  // Apply license key
  const handleApplyLicenseKey = async () => {
    if (!licenseKey.trim()) {
      setLicenseError('Please enter a license key');
      return;
    }
    
    try {
      setIsApplyingLicense(true);
      setLicenseError(null);
      
      const result = await applyLicenseKey(licenseKey.trim());
      
      if (result.success) {
        // Close license dialog
        setShowLicenseDialog(false);
        setLicenseKey('');
        
        // Set a timeout to prevent immediate state updates
        setTimeout(() => {
          // If user can now create projects, open the project creation form
          if (canCreateProject) {
            setIsCreatingProject(true);
          }
        }, 200);
      } else {
        setLicenseError(result.error || 'Invalid license key');
      }
    } catch (error) {
      setLicenseError(error.message || 'An error occurred');
    } finally {
      setIsApplyingLicense(false);
    }
  };

  // Handle submit of new project
  const handleProjectCreated = async (projectData) => {
    try {
      // Determine position for new project
      const topLevelProjects = tasks.filter(t => !t.parent_task_id);
      const position = topLevelProjects.length > 0 
        ? Math.max(...topLevelProjects.map(t => t.position || 0)) + 1 
        : 0;
      
      // Add position and ensure project is an instance
      const newProjectData = {
        ...projectData,
        position,
        parent_task_id: null, // Top-level project
        origin: "instance",
        is_complete: false
      };
      
      // Create the project using context function with selected license if applicable
      const result = await createTask(newProjectData, selectedLicenseId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Refresh tasks to include the new project
      fetchTasks();
      
      // Select the new project if it was created successfully
      if (result.data) {
        setSelectedTaskId(result.data.id);
      }
      
      // Close the project creation form
      setIsCreatingProject(false);
    } catch (err) {
      console.error('Error creating project:', err);
      if (isMountedRef.current) {
        alert(`Failed to create project: ${err.message}`);
      }
    }
  };

  // Handle canceling project creation
  const handleCancelProjectCreation = () => {
    setIsCreatingProject(false);
  };

  // Handle adding child task
  const handleAddChildTask = (parentTaskId) => {
    // Set the parent task as selected if it's not already
    setSelectedTaskId(parentTaskId);
    
    // Indicate we're adding a child to this task
    setAddingChildToTaskId(parentTaskId);
    
    // Also expand the parent task if it's not already expanded
    setExpandedTasks(prev => ({
      ...prev,
      [parentTaskId]: true
    }));
  };

  // Handle submit of the new child task form
  const handleAddChildTaskSubmit = async (taskData) => {
    try {
      // Determine position for new task
      const siblingTasks = tasks.filter(t => t.parent_task_id === taskData.parent_task_id);
      const position = siblingTasks.length > 0 
        ? Math.max(...siblingTasks.map(t => t.position || 0)) + 1 
        : 0;
      
      // Add position and ensure task is an instance
      const newTaskData = {
        ...taskData,
        position,
        origin: "instance",
        is_complete: false,
        due_date: taskData.due_date || null
      };
      
      // Create the task using context function
      const result = await createTask(newTaskData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Refresh tasks to include the new task
      fetchTasks();
      
      // Reset the adding child task state
      setAddingChildToTaskId(null);
      
      // Expand the parent task to show the new child
      if (taskData.parent_task_id) {
        setExpandedTasks(prev => ({
          ...prev,
          [taskData.parent_task_id]: true
        }));
      }
    } catch (err) {
      console.error('Error adding child task:', err);
      if (isMountedRef.current) {
        alert(`Failed to create task: ${err.message}`);
      }
    }
  };

  // Handle canceling the add child task form
  const handleCancelAddTask = () => {
    setAddingChildToTaskId(null);
  };
  
  // Render top-level tasks (projects) with spacing between them
  const renderTopLevelTasks = () => {
    const topLevelTasks = tasks
      .filter(task => !task.parent_task_id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    if (topLevelTasks.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#6b7280'
        }}>
          No projects found. Create your first project to get started!
        </div>
      );
    }
    
    const taskElements = [];
    
    // Render each project with spacing between them
    topLevelTasks.forEach((task, index) => {
      // Add the task with selectedTaskId and selectTask props
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
          onAddChildTask={handleAddChildTask}
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
  
  // Render the right panel content (task details, task form, or project creation)
  const renderRightPanel = () => {
    // If creating a new project, show the project creation form
    if (isCreatingProject) {
      return (
        <NewProjectForm 
          onSuccess={handleProjectCreated}
          onCancel={handleCancelProjectCreation}
        />
      );
    }
    
    // If there's no selected task, show the empty state
    if (!selectedTaskId) {
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
    
    // Get task
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return null;
    
    // Get color for the task
    const level = getTaskLevel(task, tasks);
    const backgroundColor = getBackgroundColor(level);
    
    // If we're adding a child task, show the form
    if (addingChildToTaskId === selectedTaskId) {
      return (
        <TaskForm
          parentTaskId={selectedTaskId}
          onSubmit={handleAddChildTaskSubmit}
          onCancel={handleCancelAddTask}
          backgroundColor={backgroundColor}
          originType="instance"
        />
      );
    }
    
    // Ensure arrays are valid
    const actions = Array.isArray(task.actions) ? task.actions : [];
    const resources = Array.isArray(task.resources) ? task.resources : [];
    
    // Otherwise show the task details
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
              {/* Checkbox to toggle completion status directly from panel */}
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
              <h3 style={{ 
                margin: 0, 
                fontWeight: 'bold',
                textDecoration: task.is_complete ? 'line-through' : 'none',
                opacity: task.is_complete ? 0.8 : 1,
              }}>
                {task.title}
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
          
          {/* Add child task button in details panel */}
          <div className="detail-row" style={{ marginTop: '24px' }}>
            <button
              onClick={() => handleAddChildTask(task.id)}
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
                width: '100%'
              }}
            >
              <span style={{ marginRight: '8px' }}>Add Child Task</span>
              <span>+</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      {/* License Key Dialog */}
      {showLicenseDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginTop: 0, marginBottom: '16px' }}>Enter License Key</h2>
            <p style={{ marginBottom: '16px', color: '#4b5563' }}>
              {projectLimitReason || 'You need a license key to create more projects.'}
            </p>
            
            {licenseError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '16px'
              }}>
                {licenseError}
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 500 
              }}>
                License Key
              </label>
              <input 
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Enter your license key"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            {userLicenses.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 500, marginBottom: '8px' }}>Your Licenses</p>
                <div style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px'
                }}>
                  {userLicenses.map(license => (
                    <div key={license.id} style={{
                      padding: '12px',
                      borderBottom: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{license.plan_name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {license.is_used ? 'Used' : 'Available'}
                        </div>
                      </div>
                      {!license.is_used && (
                        <button
                          onClick={() => {
                            selectLicense(license.id);
                            setShowLicenseDialog(false);
                            setIsCreatingProject(true);
                          }}
                          style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Use
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                onClick={() => setShowLicenseDialog(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyLicenseKey}
                disabled={isApplyingLicense}
                style={{
                  padding: '10px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: isApplyingLicense ? 'not-allowed' : 'pointer',
                  opacity: isApplyingLicense ? 0.7 : 1
                }}
              >
                {isApplyingLicense ? 'Processing...' : 'Apply License'}
              </button>
            </div>
          </div>
        </div>
      )}
    
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Projects</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleCreateNewProject}
              disabled={isCreatingProject || loading || (isCheckingLicense && !canCreateProject)}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: (isCreatingProject || loading || (isCheckingLicense && !canCreateProject)) ? 'not-allowed' : 'pointer',
                border: 'none',
                opacity: (isCreatingProject || loading || (isCheckingLicense && !canCreateProject)) ? 0.7 : 1
              }}
            >
              New Project
            </button>
            <button 
              onClick={() => fetchTasks(true)}
              disabled={loading}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Display license status message if applicable */}
        {!initialLoading && !error && tasks.length > 0 && !canCreateProject && (
          <div style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            color: '#c2410c',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Project Limit Reached</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{projectLimitReason}</p>
            </div>
            <button
              onClick={handleCreateNewProject}
              style={{
                backgroundColor: '#ea580c',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Enter License Key
            </button>
          </div>
        )}

        {initialLoading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              margin: '0 auto', 
              border: '3px solid #e5e7eb', 
              borderTopColor: '#3b82f6', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }} />
            <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading your projects...</p>
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
        ) : tasks.filter(t => !t.parent_task_id).length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            color: '#6b7280'
          }}>
            {canCreateProject ? (
              <div>
                <p>No projects found. Create your first project to get started!</p>
                <button
                  onClick={handleCreateNewProject}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: 'none',
                    marginTop: '16px'
                  }}
                >
                  Create First Project
                </button>
              </div>
            ) : (
              <div>
                <p>No projects found. You need a license key to create a project.</p>
                <button
                  onClick={handleCreateNewProject}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: 'none',
                    marginTop: '16px'
                  }}
                >
                  Enter License Key
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>{renderTopLevelTasks()}</div>
        )}
      </div>
      
      {/* Right panel - Task details or task form or project creation */}
      <div style={{ 
        flex: '1 1 40%', 
        minWidth: '300px',
        maxWidth: '500px'
      }}>
        {renderRightPanel()}
      </div>
      
      {/* Debug section - comment out for production */}
      {/* <details style={{ 
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
          <p>Total projects: {tasks.length}</p>
          <p>Top-level projects: {tasks.filter(t => !t.parent_task_id).length}</p>
          <p>Dragging: {dragAndDrop.draggedTask ? dragAndDrop.draggedTask.title : 'None'}</p>
          <p>Drop target: {dragAndDrop.dropTarget ? `${dragAndDrop.dropTarget.title} (${dragAndDrop.dropPosition})` : 'None'}</p>
          <p>Selected task: {selectedTaskId || 'None'}</p>
          <p>Adding child to: {addingChildToTaskId || 'None'}</p>
          <details>
            <summary>Project Positions</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {JSON.stringify(
                tasks.map(t => ({ 
                  id: t.id, 
                  title: t.title,
                  position: t.position, 
                  parent: t.parent_task_id,
                  origin: t.origin
                })), 
                null, 
                2
              )}
            </pre>
          </details>
        </div>
      </details> */}
    </div>
  );
};

export default TaskList;