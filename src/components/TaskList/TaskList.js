import React, { useState } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import TaskDropZone from './TaskDropZone';
import TaskForm from '../TaskForm/TaskForm';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { updateTaskCompletion } from '../../services/taskService';
import { useTasks } from '../contexts/TaskContext'; // Import the useTasks hook

const TaskList = () => {
  // Use the context instead of local state for tasks
  const { 
    instanceTasks: tasks, 
    loading, 
    initialLoading, // Use initialLoading from context
    error, 
    fetchTasks, 
    setTasks 
  } = useTasks();
  
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [addingChildToTaskId, setAddingChildToTaskId] = useState(null);

  // Initialize the drag and drop functionality
  const dragAndDrop = useTaskDragAndDrop(tasks, setTasks, fetchTasks);
  
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
  
  // Handle task completion toggle
  const toggleTaskCompletion = async (taskId, currentStatus, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const result = await updateTaskCompletion(taskId, currentStatus);
      
      if (!result.success) throw new Error(result.error);
      
      setTasks(
        tasks.map(task => 
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
      console.log("Form submitted with data:", JSON.stringify(taskData, null, 2));
      
      // Implementation details for adding a task...
      // (existing implementation)
      
      // After successfully adding, refresh tasks
      fetchTasks(true);
      
    } catch (err) {
      console.error('Error adding child task:', err);
      alert(`Failed to create task: ${err.message}`);
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
      .sort((a, b) => a.position - b.position);
    
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
  
  // Render the right panel content (task details or task form)
  const renderRightPanel = () => {
    // Implementation for right panel rendering...
    // (Keep existing implementation)
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
            <button 
              onClick={() => alert('Create new project functionality would go here')}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              New Project
            </button>
            <button 
              onClick={() => fetchTasks(true)}
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
        </div>

        {initialLoading ? ( // Use initialLoading instead of loading
          <div style={{ 
            textAlign: 'center', 
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #3b82f6',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ marginTop: '16px', color: '#6b7280' }}>
              Loading your projects...
            </p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
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
            No projects found. Create your first project to get started!
          </div>
        ) : (
          <div>{renderTopLevelTasks()}</div>
        )}
      </div>
      
      {/* Right panel - Task details or task form */}
      <div style={{ 
        flex: '1 1 40%', 
        minWidth: '300px',
        maxWidth: '500px'
      }}>
        {renderRightPanel()}
      </div>
      
      {/* Debug section */}
      <details style={{ 
        position: 'fixed',
        bottom: '10px',
        right: '10px',
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
          <p>Initial loading: {initialLoading ? 'Yes' : 'No'}</p>
          <p>Regular loading: {loading ? 'Yes' : 'No'}</p>
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
      </details>
    </div>
  );
};

export default TaskList;