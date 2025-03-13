import React, { useEffect, useState } from 'react';
import TemplateItem from './TemplateItem';
import TaskDropZone from '../TaskList/TaskDropZone';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { fetchAllTasks } from '../../services/taskService';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import '../TaskList/TaskList.css';

const TemplateList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await fetchAllTasks();

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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Templates</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => alert('Create new template functionality would go here')}
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
      
      {/* Right panel - Template details */}
      <div style={{ 
        flex: '1 1 40%', 
        minWidth: '300px',
        maxWidth: '500px'
      }}>
        {renderTemplateDetailsPanel()}
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
          <p>Total templates: {tasks.length}</p>
          <p>Top-level templates: {tasks.filter(t => !t.parent_task_id).length}</p>
          <p>Dragging: {dragAndDrop.draggedTask ? dragAndDrop.draggedTask.title : 'None'}</p>
          <p>Drop target: {dragAndDrop.dropTarget ? `${dragAndDrop.dropTarget.title} (${dragAndDrop.dropPosition})` : 'None'}</p>
          <p>Selected template: {selectedTaskId || 'None'}</p>
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