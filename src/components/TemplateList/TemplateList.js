import React, { useEffect, useState } from 'react';
import TemplateItem from './TemplateItem';
import TaskForm from '../TaskForm/TaskForm'; // Updated import path
import TaskDropZone from '../TaskList/TaskDropZone';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { fetchAllTasks, createTask } from '../../services/taskService';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import { useOrganization } from '../contexts/OrganizationProvider';
import '../TaskList/TaskList.css';

const TemplateList = () => {
  const { organization, organizationId, loading: orgLoading } = useOrganization();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  
  
  // State variables for the task form
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [addTaskParentId, setAddTaskParentId] = useState(null);

  useEffect(() => {
    if (!orgLoading) {
      fetchTemplates();
    }
  }, [organizationId, orgLoading]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await fetchAllTasks(organizationId);

      if (error) throw new Error(error);
      
      // Filter to only include template tasks
      const templateTasks = data ? data.filter(task => task.origin === "template") : [];
      console.log('Fetched templates:', templateTasks);
      
      setTasks(templateTasks);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(`Failed to load templates: ${err.message}`);
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
  
  // Function to handle the "Add Task" button click
  const handleAddTaskClick = (parentId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setAddTaskParentId(parentId);
    setShowAddTaskForm(true);
    
    // Optionally deselect any selected task when starting to add a new one
    setSelectedTaskId(null);
  };
  
  // Function to handle submitting the new task form
  const handleTaskFormSubmit = async (taskData) => {
    try {
      // Determine position for new task
      const siblingTasks = tasks.filter(t => t.parent_task_id === taskData.parent_task_id);
      const position = siblingTasks.length > 0 
        ? Math.max(...siblingTasks.map(t => t.position)) + 1 
        : 0;
      
      // Add position to task data
      const newTaskData = {
        ...taskData,
        position,
        white_label_id: organizationId // Add the white label organization ID here
      };
      
      // Call API to create task
      const result = await createTask(newTaskData, organizationId);
      
      if (result.error) throw new Error(result.error);
      
      // Update local state with new task
      if (result.data) {
        setTasks([...tasks, result.data]);
      }
      
      // Close the form
      setShowAddTaskForm(false);
      setAddTaskParentId(null);
      
      // Expand the parent task to show the new child
      if (taskData.parent_task_id) {
        setExpandedTasks(prev => ({
          ...prev,
          [taskData.parent_task_id]: true
        }));
      }
      
    } catch (err) {
      console.error('Error creating task:', err);
      alert(`Failed to create task: ${err.message}`);
    }
  };
  
  // Get the selected task object
  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  // Initialize the drag and drop functionality
  const dragAndDrop = useTaskDragAndDrop(tasks, setTasks, fetchTemplates);
  
  // Render top-level tasks (templates) with spacing between them
  const renderTopLevelTemplates = () => {
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
          No templates found. Create your first template to get started!
        </div>
      );
    }
    
    const taskElements = [];
    
    // Render each template with spacing between them
    topLevelTasks.forEach((task, index) => {
      // Add the template using TemplateItem component
      taskElements.push(
        <TemplateItem 
          key={task.id}
          task={task}
          tasks={tasks}
          expandedTasks={expandedTasks}
          toggleExpandTask={toggleExpandTask}
          selectedTaskId={selectedTaskId}
          selectTask={selectTask}
          setTasks={setTasks}
          dragAndDrop={dragAndDrop}
          onAddTask={handleAddTaskClick}  // Pass the onAddTask function
        />
      );
      
      // Add a spacing div after each template (except the last one)
      if (index < topLevelTasks.length - 1) {
        taskElements.push(
          <div 
            key={`template-spacer-${index}`}
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
  
  // Render the details panel for the selected template
  const renderTemplateDetailsPanel = () => {
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
            Select a template to view its details
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
          
          <div className="detail-row" style={{ marginTop: '24px' }}>
            <button
              onClick={() => alert(`Create project from template: ${selectedTask.title}`)}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                width: '100%'
              }}
            >
              Use as Project
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      {/* Left panel - Template list */}
      <div style={{ 
        flex: showAddTaskForm ? '1 1 40%' : '1 1 60%', 
        marginRight: '24px',
        overflow: 'auto',
        transition: 'flex 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Templates</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => {
                setAddTaskParentId(null);
                setShowAddTaskForm(true);
                setSelectedTaskId(null);
              }}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              New Template
            </button>
            <button 
              onClick={fetchTemplates}
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
            No templates found. Create your first template to get started!
          </div>
        ) : (
          <div>{renderTopLevelTemplates()}</div>
        )}
      </div>
      
      {/* Middle panel - Template details - only show if not showing form and a task is selected */}
      {!showAddTaskForm && selectedTaskId && (
        <div style={{ 
          flex: '1 1 40%', 
          minWidth: '300px',
          maxWidth: '500px'
        }}>
          {renderTemplateDetailsPanel()}
        </div>
      )}
      
      {/* Right panel - Add Task Form - only show when adding a task */}
      {showAddTaskForm && (
        <div style={{ 
          flex: '1 1 40%', 
          minWidth: '300px',
          maxWidth: '500px'
        }}>
          <TaskForm 
            parentTaskId={addTaskParentId}
            onSubmit={handleTaskFormSubmit}
            onCancel={() => {
              setShowAddTaskForm(false);
              setAddTaskParentId(null);
            }}
            backgroundColor={addTaskParentId 
              ? getBackgroundColor(getTaskLevel(tasks.find(t => t.id === addTaskParentId), tasks) + 1)
              : getBackgroundColor(0)
            }
            originType="template"
            organizationId={organizationId} // Add this line
          />
        </div>
      )}
      
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
          <p>Total templates: {tasks.length}</p>
          <p>Top-level templates: {tasks.filter(t => !t.parent_task_id).length}</p>
          <p>Dragging: {dragAndDrop.draggedTask ? dragAndDrop.draggedTask.title : 'None'}</p>
          <p>Drop target: {dragAndDrop.dropTarget ? `${dragAndDrop.dropTarget.title} (${dragAndDrop.dropPosition})` : 'None'}</p>
          <p>Selected template: {selectedTaskId || 'None'}</p>
          <p>Adding task to parent: {addTaskParentId || 'None (top-level)'}</p>
          <details>
            <summary>Template Positions</summary>
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

export default TemplateList;