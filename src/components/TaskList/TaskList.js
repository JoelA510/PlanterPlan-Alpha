import React, { useState, useEffect, useRef } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import TaskDropZone from './TaskDropZone';
import TaskForm from '../TaskForm/TaskForm';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { useTasks } from '../contexts/TaskContext';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';

const TaskList = () => {
  // Use the tasks context
  const { 
    instanceTasks: tasks, 
    loading, 
    initialLoading,
    error, 
    fetchTasks, 
    setTasks,
    createTask
  } = useTasks();
  
  const isMountedRef = useRef(true);
  
  // Local state
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [addingChildToTaskId, setAddingChildToTaskId] = useState(null);
  const [isAddingNewProject, setIsAddingNewProject] = useState(false); // New state for adding project
  
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);
  
  // Initialize drag and drop
  const dragAndDrop = useTaskDragAndDrop(tasks, setTasks, fetchTasks);
  
  // Toggle task expansion
  const toggleExpandTask = (taskId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
  
  // Select a task to show details
  const selectTask = (taskId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (addingChildToTaskId && addingChildToTaskId !== taskId) {
      setAddingChildToTaskId(null);
    }
    
    setSelectedTaskId(prevId => prevId === taskId ? null : taskId);
  };
  
  // Get the selected task object
  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  // Add this function to your TaskList component
const toggleTaskCompletion = async (taskId, currentStatus, e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  try {
    // Import this from your services if not already imported
    const { updateTaskCompletion } = await import('../../services/taskService');
    
    const result = await updateTaskCompletion(taskId, currentStatus);
    
    if (!result.success) throw new Error(result.error);
    
    // Only update state if component is still mounted
    if (isMountedRef.current) {
      setTasks(
        tasks.map(task => 
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

  // Function to handle adding a new top-level project
  const handleAddNewProject = () => {
    // Clear any selected task
    setSelectedTaskId(null);
    
    // Clear any child task addition
    setAddingChildToTaskId(null);
    
    // Set the state to show the form
    setIsAddingNewProject(true);
  };

  // Handle submit of the new project form
  const handleNewProjectSubmit = async (projectData) => {
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
      
      // Create the project using context function
      const result = await createTask(newProjectData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Close the form
      setIsAddingNewProject(false);
      
    } catch (err) {
      console.error('Error adding project:', err);
      if (isMountedRef.current) {
        alert(`Failed to create project: ${err.message}`);
      }
    }
  };

  // Handle canceling the add project form
  const handleCancelAddProject = () => {
    setIsAddingNewProject(false);
  };

  // Handle adding child task
  const handleAddChildTask = (parentTaskId) => {
    setSelectedTaskId(parentTaskId);
    setAddingChildToTaskId(parentTaskId);
    setExpandedTasks(prev => ({
      ...prev,
      [parentTaskId]: true
    }));
  };
  
  // Handle form submission for new child task
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
        due_date: taskData.due_date || null
      };
      
      // Create the task using context function
      const result = await createTask(newTaskData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Close the form and expand parent
      setAddingChildToTaskId(null);
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
  
  // Handle canceling the add task form
  const handleCancelAddTask = () => {
    setAddingChildToTaskId(null);
  };

  
  
  // Render top-level tasks
  const renderTopLevelTasks = () => {
    const topLevelTasks = tasks
      .filter(task => !task.parent_task_id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    if (topLevelTasks.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No projects found. Create your first project to get started!
        </div>
      );
    }
    
    const taskElements = [];
    
    topLevelTasks.forEach((task, index) => {
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
      
      if (index < topLevelTasks.length - 1) {
        taskElements.push(
          <div 
            key={`project-spacer-${index}`}
            className="h-1.5 my-0.5"
          />
        );
      }
    });
    
    return taskElements;
  };
  
  // UI for the right panel (details or form)
  const renderRightPanel = () => {
    // If we're adding a new project, show the form
    if (isAddingNewProject) {
      return (
        <TaskForm
          parentTaskId={null} // No parent for top-level projects
          onSubmit={handleNewProjectSubmit}
          onCancel={handleCancelAddProject}
          backgroundColor="#10b981" // Green color for new projects
          originType="instance"
        />
      );
    }
    
    // No selected task
    if (!selectedTaskId) {
      return (
        <div className="empty-details-panel flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300 p-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <p className="mt-4 text-center">
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
    
    // Showing the add form
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
    
    // Show task details
    return (
      <div className="task-details-panel bg-gray-50 rounded border border-gray-200 h-full overflow-auto">
        <div className="details-header" style={{
          backgroundColor: backgroundColor,
          color: 'white',
          padding: '16px',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          position: 'relative'
        }}>
          {/* Status badge */}
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
          
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center">
              <input 
                type="checkbox"
                checked={task.is_complete || false}
                onChange={(e) => toggleTaskCompletion(task.id, task.is_complete, e)}
                className="mr-3 w-4.5 h-4.5"
                style={{
                  accentColor: task.is_complete ? '#059669' : undefined
                }}
              />
              <h3 className="m-0 font-bold" style={{
                textDecoration: task.is_complete ? 'line-through' : 'none',
                opacity: task.is_complete ? 0.8 : 1,
              }}>
                {task.title}
              </h3>
            </div>
            
            <button 
              onClick={() => setSelectedTaskId(null)}
              className="bg-white bg-opacity-20 border-0 rounded-full text-white cursor-pointer w-6 h-6 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="details-content p-4">
          {/* Task details sections */}
          <div className="detail-row">
            <h4 className="font-bold mb-1">Status:</h4>
            <div className="flex items-center">
              <p className="inline-block py-1 px-2 bg-red-100 text-red-800 rounded text-sm mt-1 mr-2" style={{
                backgroundColor: task.is_complete ? '#dcfce7' : '#fee2e2',
                color: task.is_complete ? '#166534' : '#b91c1c',
              }}>
                {task.is_complete ? 'Completed' : 'In Progress'}
              </p>
            </div>
            
            <div className="mt-2 h-2 w-full bg-gray-200 rounded overflow-hidden">
              <div className="h-full rounded transition-all duration-500" style={{
                width: task.is_complete ? '100%' : '0%',
                backgroundColor: '#059669',
              }} />
            </div>
          </div>
          
          <div className="detail-row">
            <h4 className="font-bold mb-1 mt-4">Due Date:</h4>
            <p>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</p>
          </div>
          
          <div className="detail-row">
            <h4 className="font-bold mb-1 mt-4">Purpose:</h4>
            <p>{task.purpose || 'No purpose specified'}</p>
          </div>
          
          <div className="detail-row">
            <h4 className="font-bold mb-1 mt-4">Description:</h4>
            <p>{task.description || 'No description specified'}</p>
          </div>
          
          <div className="detail-row">
            <h4 className="font-bold mb-1 mt-4">Actions:</h4>
            <ul className="pl-5 mt-2 mb-0">
              {actions.length > 0 ? 
                actions.map((action, index) => (
                  <li key={index}>{action}</li>
                )) : 
                <li>No actions specified</li>
              }
            </ul>
          </div>
          
          <div className="detail-row">
            <h4 className="font-bold mb-1 mt-4">Resources:</h4>
            <ul className="pl-5 mt-2 mb-0">
              {resources.length > 0 ? 
                resources.map((resource, index) => (
                  <li key={index}>{resource}</li>
                )) : 
                <li>No resources specified</li>
              }
            </ul>
          </div>
          
          {/* Add child task button */}
          <div className="detail-row mt-6">
            <button
              onClick={() => handleAddChildTask(task.id)}
              className="bg-green-500 text-white py-2 px-4 rounded border-0 flex items-center justify-center w-full"
            >
              <span className="mr-2">Add Child Task</span>
              <span>+</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-100px)]">
      {/* Left panel - Task list */}
      <div className="flex-1 flex-grow-6 mr-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <div className="flex gap-3">
            <button 
              onClick={handleAddNewProject}
              className="bg-green-500 text-white py-2 px-4 rounded border-0"
            >
              New Project
            </button>
            <button 
              onClick={() => fetchTasks(true)}
              className="bg-blue-500 text-white py-2 px-4 rounded border-0"
            >
              Refresh
            </button>
          </div>
        </div>

        {initialLoading ? (
          <div className="text-center py-8 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full border-3 border-gray-200 border-t-blue-500 animate-spin" />
            <p className="mt-4 text-gray-500">Loading your projects...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
            {error}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No projects found. Create your first project to get started!
          </div>
        ) : (
          <div>{renderTopLevelTasks()}</div>
        )}
      </div>
      
      {/* Right panel - Task details or task form */}
      <div className="flex-1 flex-grow-4 min-w-75 max-w-125">
        {renderRightPanel()}
      </div>
    </div>
  );
};

export default TaskList;