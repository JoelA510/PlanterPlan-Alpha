// src/components/TaskList/TaskList.js
import React, { useState, useEffect, useRef } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import TaskForm from '../TaskForm/TaskForm';
import NewProjectForm from '../TaskForm/NewProjectForm';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { useTasks } from '../contexts/TaskContext';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import { updateTaskCompletion, deleteTask, updateTaskComplete } from '../../services/taskService';
import TaskDetailsPanel from './TaskDetailsPanel';
import TemplateProjectCreator from '../TemplateProject/TemplateProjectCreator';
import { getNextAvailablePosition } from '../../utils/sparsePositioning';

const TaskList = () => {
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
    // userLicenses,
    selectedLicenseId,
    isCheckingLicense,
    // fetchUserLicenses,
    // getSelectedLicense,
    userHasProjects,

  } = useTasks();
  
  // Local state
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [addingChildToTaskId, setAddingChildToTaskId] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  // Add state for active license for new project
  const [projectLicenseId, setProjectLicenseId] = useState(null);
  // Add local loading state for the refresh button
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Refs for tracking state without triggering re-renders
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  
  

  useEffect(() => {
    // Only fetch on initial mount to avoid redundant fetches
    // since the context already handles automatic fetching
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true; // Mark as done immediately to prevent loops
    }
    
    return () => { isMountedRef.current = false; };
  }, []);
  
  // Reset the project license ID when the selected license changes
  useEffect(() => {
    if (selectedLicenseId) {
      setProjectLicenseId(selectedLicenseId);
    }
  }, [selectedLicenseId]);

  // Handle refresh button click
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Explicitly call fetchTasks with forceRefresh=true
      await fetchTasks(true);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

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
  
  // Function to handle creating a new project
  // Function to handle creating a new project
const handleCreateNewProject = () => {
  console.log('handleCreateNewProject: START');
  
  // Reset all states to make sure we're in a clean state
  setIsCreatingFromTemplate(false);
  setAddingChildToTaskId(null);
  setSelectedTaskId(null);
  
  // Set creating project state
  console.log('handleCreateNewProject: Setting isCreatingProject to true');
  setIsCreatingProject(true);
  console.log('handleCreateNewProject: END');
};


  // Handle submit of new project
  const handleProjectCreated = async (projectData) => {
    try {
      console.log('Project created successfully:', projectData.id);
      
      // Refresh tasks to include the new project
      await fetchTasks(true);
      
      // Select the new project
      setSelectedTaskId(projectData.id);
      
      // Reset license ID and close the project creation form
      setProjectLicenseId(null);
      setIsCreatingProject(false);
    } catch (err) {
      console.error('Error handling project creation:', err);
      if (isMountedRef.current) {
        alert(`Error refreshing data: ${err.message}`);
      }
    }
  };

  // Handle canceling project creation
  const handleCancelProjectCreation = () => {
    setIsCreatingProject(false);
    setProjectLicenseId(null);
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

    // Add position and ensure task is an instance
    const newTaskData = {
      ...taskData,
      origin: "instance",
      is_complete: false,
      due_date: taskData.due_date || null
    };
    
    
    // Create the task using context function
    // Child tasks don't need a license ID - they inherit from parent
    const result = await createTask(newTaskData);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Refresh tasks to include the new task
    await fetchTasks(true);
    
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


  // Update the handleDeleteTask function in TaskList.js
const handleDeleteTask = async (taskId) => {
  // Find the task to check if it has children
  const taskToDelete = tasks.find(t => t.id === taskId);
  if (!taskToDelete) return;
  
  const hasChildren = tasks.some(t => t.parent_task_id === taskId);
  
  // Prepare confirmation message
  let confirmMessage = 'Are you sure you want to delete this task?';
  if (hasChildren) {
    confirmMessage = 'This task has subtasks that will also be deleted. Are you sure you want to continue?';
  }
  confirmMessage += ' This action cannot be undone.';
  
  // Ask for confirmation
  if (!window.confirm(confirmMessage)) {
    return;
  }
  
  try {
    // Use the deleteTask function from the service
    const result = await deleteTask(taskId, true); // true to delete children
    
    if (!result.success) throw new Error(result.error);
    
    // Update the local state to remove the deleted tasks
    if (result.deletedIds && Array.isArray(result.deletedIds)) {
      // Create the filtered array first, then update the state
      const updatedTasks = tasks.filter(task => !result.deletedIds.includes(task.id));
      setTasks(updatedTasks);
      
      // If the selected task was deleted, clear the selection
      if (result.deletedIds.includes(selectedTaskId)) {
        setSelectedTaskId(null);
      }
    } else {
      // Fallback if deletedIds is not returned
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      setTasks(updatedTasks);
      
      // If the selected task was deleted, clear the selection
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
    }
    
    // Show success message
    const deletedCount = result.deletedIds ? result.deletedIds.length : 1;
    const childCount = deletedCount - 1;
    
    alert(hasChildren 
      ? `Task and ${childCount} subtask${childCount !== 1 ? 's' : ''} deleted successfully` 
      : 'Task deleted successfully');
      
    // Refresh tasks after deletion
    await fetchTasks(true);
  } catch (err) {
    console.error('Error deleting task:', err);
    if (isMountedRef.current) {
      alert(`Failed to delete task: ${err.message}`);
    }
  }
};
// Handle editing a task
const handleEditTask = async (taskId, updatedTaskData) => {
  try {
    // Find the task to update
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
      throw new Error('Task not found');
    }
    
    console.log('Updating task with data:', updatedTaskData);
    
    // Use the updateTaskComplete function from the service
    const result = await updateTaskComplete(taskId, updatedTaskData);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update task');
    }
    
    // Update the local state with the updated task
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...result.data } : task
    );
    
    // Update local state
    setTasks(updatedTasks);
    
    // Show success message
    alert('Task updated successfully');
    
    // Optionally refresh tasks to ensure we have the latest data
    await fetchTasks(true);
    
  } catch (err) {
    console.error('Error updating task:', err);
    alert(`Failed to update task: ${err.message}`);
  }
};
  // Add a function to handle creating a project from template
  const handleCreateFromTemplate = () => {
    console.log('handleCreateFromTemplate: START');
    
    // Reset all states to make sure we're in a clean state
    setIsCreatingProject(false);
    setAddingChildToTaskId(null);
    setSelectedTaskId(null);
    
    // Set creating from template state
    console.log('handleCreateFromTemplate: Setting isCreatingFromTemplate to true');
    setIsCreatingFromTemplate(true);
    console.log('handleCreateFromTemplate: END');
  };

// Add a function to handle successful project creation from template
const handleProjectFromTemplateCreated = async (projectData) => {
  try {
    console.log('Project created from template successfully:', projectData.id);
    
    // Refresh tasks to include the new project
    await fetchTasks(true);
    
    // Select the new project
    setSelectedTaskId(projectData.id);
    
    // Close the template creator
    setIsCreatingFromTemplate(false);
  } catch (err) {
    console.error('Error handling project creation from template:', err);
    if (isMountedRef.current) {
      alert(`Error refreshing data: ${err.message}`);
    }
  }
};

// Add a function to handle cancelling project creation from template
const handleCancelTemplateProjectCreation = () => {
  setIsCreatingFromTemplate(false);
};

// Add a click outside handler for the dropdown
// useEffect(() => {
//   const handleClickOutside = (event) => {
//     if (showProjectMenu) {
//       setShowProjectMenu(false);
//     }
//   };
  
//   document.addEventListener('mousedown', handleClickOutside);
//   return () => {
//     document.removeEventListener('mousedown', handleClickOutside);
//   };
// }, [showProjectMenu]);
  
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
          userHasProjects={userHasProjects}
        />
      );
    }
    if (isCreatingFromTemplate) {
      return (
        <TemplateProjectCreator 
          onSuccess={handleProjectFromTemplateCreated}
          onCancel={handleCancelTemplateProjectCreation}
          userHasProjects={userHasProjects}
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
    
    // Get the selected task object
    const selectedTask = tasks.find(task => task.id === selectedTaskId);
    if (!selectedTask) return null;
    
    // If we're adding a child task, show the form
    if (addingChildToTaskId === selectedTaskId) {
      return (
        <TaskForm
          parentTaskId={selectedTaskId}
          onSubmit={handleAddChildTaskSubmit}
          onCancel={handleCancelAddTask}
          backgroundColor={getBackgroundColor(getTaskLevel(selectedTask, tasks))}
          originType="instance"
        />
      );
    }
    // Update this in the renderRightPanel function where the TaskDetailsPanel is returned
    return (
      <TaskDetailsPanel
        key={`${selectedTask.id}-${selectedTask.is_complete}`}
        task={selectedTask}
        tasks={tasks}
        toggleTaskCompletion={toggleTaskCompletion}
        onClose={() => setSelectedTaskId(null)}
        onAddChildTask={handleAddChildTask}
        onDeleteTask={handleDeleteTask}
        onEditTask={handleEditTask}
      />
    );
    
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Projects</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
          <div className="dropdown" style={{ position: 'relative' }}>
            <button 
              className="project-dropdown-button"
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              New Project <span style={{ fontSize: '10px', marginTop: '2px' }}>▼</span>
            </button>
            
            {showProjectMenu && (
              <div 
                className="project-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  zIndex: 10,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  width: '200px',
                  marginTop: '4px'
                }}
              >
                <div style={{ padding: '8px 12px', cursor: 'pointer' }}
                    onClick={() => {
                      console.log('Blank Project clicked');
                      handleCreateNewProject();
                      setShowProjectMenu(false);
                    }}>
                  Blank Project
                </div>
                <div style={{ borderTop: '1px solid #e5e7eb' }}></div>
                <div style={{ padding: '8px 12px', cursor: 'pointer' }}
                    onClick={() => {
                      console.log('From Template clicked');
                      handleCreateFromTemplate();
                      setShowProjectMenu(false);
                    }}>
                  From Template
                </div>
              </div>
            )}
            </div>
            <button 
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: (loading || isRefreshing) ? 'not-allowed' : 'pointer',
                border: 'none',
                opacity: (loading || isRefreshing) ? 0.7 : 1
              }}
            >
              {loading || isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
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
    </div>
  );
};

export default TaskList;