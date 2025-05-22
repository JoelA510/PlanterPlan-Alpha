import React, { useState, useEffect, useRef } from 'react';
import TemplateItem from './TemplateItem';
import TaskDropZone from '../TaskList/TaskDropZone';
import TemplateTaskForm from '../TaskForm/TemplateTaskForm';
import CreateNewTemplateForm from '../TaskForm/CreateNewTemplateForm';
import TemplateDetailsPanel from './TemplateDetailsPanel';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { useTasks } from '../contexts/TaskContext';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import '../TaskList/TaskList.css';

const TemplateList = () => {
  // Use the tasks context with enhanced template functionality
  const { 
    templateTasks: tasks, 
    loading, 
    initialLoading,
    error, 
    fetchTasks, 
    setTasks,

    // New template task specific functions and state
    handleAddTemplateTask,
    handleCreateNewTemplate,
    cancelTemplateCreation,
    createNewTemplate,
    addTemplateTask,
    // Template state
    isCreatingNewTemplate,
    addingChildToTemplateId,

    deleteTask,
    updateTask
  } = useTasks();
  
  const isMountedRef = useRef(true);
  
  // Local state
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Handle refresh button click
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error refreshing templates:', error);
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
  
  // Select a task to show details
  const selectTask = (taskId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setSelectedTaskId(prevId => prevId === taskId ? null : taskId);
  };
  
  // Get the selected task object
  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  // Initialize drag and drop
  const dragAndDrop = useTaskDragAndDrop(tasks, setTasks, fetchTasks);
  

// Handler for creating a new top-level template
const handleNewTemplateSubmit = async (templateData) => {
  try {
    const result = await createNewTemplate(templateData);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (err) {
    console.error('Error creating new template:', err);
    alert(`Failed to create new template: ${err.message}`);
    return { error: err.message };
  }
};

// Handler for adding a template task (child) to an existing template
const handleTemplateTaskSubmit = async (templateData) => {
  try {
    const result = await addTemplateTask(templateData);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (err) {
    console.error('Error adding template task:', err);
    alert(`Failed to add template task: ${err.message}`);
    return { error: err.message };
  }
};

  // Handle edit template
  const handleEditTemplate = async (templateId, updatedData) => {
    try {
      console.log('Updating template with data:', updatedData);
      
      const result = await updateTask(templateId, updatedData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update template');
      }
      
      // Show success message
      alert('Template updated successfully');
      
      // Refresh tasks to ensure we have the latest data
      await fetchTasks(true);
      
    } catch (err) {
      console.error('Error updating template:', err);
      alert(`Failed to update template: ${err.message}`);
    }
  };
  
  // Handle delete template
  const handleDeleteTemplate = async (templateId) => {
    // Find the template to check if it has children
    const templateToDelete = tasks.find(t => t.id === templateId);
    if (!templateToDelete) return;
    
    const hasChildren = tasks.some(t => t.parent_task_id === templateId);
    
    // Prepare confirmation message
    let confirmMessage = 'Are you sure you want to delete this template?';
    if (hasChildren) {
      confirmMessage = 'This template has child templates that will also be deleted. Are you sure you want to continue?';
    }
    confirmMessage += ' This action cannot be undone.';
    
    // Ask for confirmation
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      // For templates, we can use a direct approach that's less likely to have date calculation issues
      // First, clear the selection if this template is selected
      if (selectedTaskId === templateId) {
        setSelectedTaskId(null);
      }
      
      // Use the deleteTask function from the task context with error handling
      const result = await deleteTask(templateId, true); // true to delete children
      
      if (!result.success) {
        // Handle specific known error cases
        if (result.error && result.error.includes("Invalid time value")) {
          console.warn("Date calculation issue detected during deletion, continuing with UI update");
          
          // Even if we had date calculation issues, we can still update the UI optimistically
          // Get all child templates to be removed from UI
          const childTemplateIds = [];
          const findAllChildren = (parentId) => {
            const children = tasks.filter(t => t.parent_task_id === parentId).map(t => t.id);
            childTemplateIds.push(...children);
            children.forEach(childId => findAllChildren(childId));
          };
          
          findAllChildren(templateId);
          
          // Update tasks state to remove deleted templates
          const allIdsToRemove = [templateId, ...childTemplateIds];
          setTasks(prevTasks => prevTasks.filter(t => !allIdsToRemove.includes(t.id)));
          
          // Show success message
          alert(hasChildren 
            ? `Template and ${childTemplateIds.length} child template${childTemplateIds.length !== 1 ? 's' : ''} deleted successfully` 
            : 'Template deleted successfully');
            
          // Refresh tasks after deletion
          await fetchTasks(true);
          return;
        }
        
        throw new Error(result.error);
      }
      
      // Show success message
      const deletedCount = result.deletedIds ? result.deletedIds.length : 1;
      const childCount = deletedCount - 1;
      
      alert(hasChildren 
        ? `Template and ${childCount} child template${childCount !== 1 ? 's' : ''} deleted successfully` 
        : 'Template deleted successfully');
        
      // Refresh tasks after deletion
      await fetchTasks(true);
    } catch (err) {
      console.error('Error deleting template:', err);
      
      // Special handling for known error types
      if (err.message && (
        err.message.includes("Invalid time value") || 
        err.message.includes("Invalid date")
      )) {
        alert("There was an issue with template dates during deletion, but the template has been removed.");
        // Force refresh to ensure UI is consistent
        await fetchTasks(true);
      } else {
        alert(`Failed to delete template: ${err.message}`);
      }
    }
  };
  
  // Render top-level tasks (templates) with spacing between them
  const renderTopLevelTemplates = () => {
    const topLevelTasks = tasks
      .filter(task => !task.parent_task_id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    if (topLevelTasks.length === 0 && !isCreatingNewTemplate) {
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
          onAddTask={handleAddTemplateTask}
          
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
  
  // Render the right panel content (task details or task form)
  const renderRightPanel = () => {
    // For when we're adding a top-level template
    if (isCreatingNewTemplate) {
      return (
        <CreateNewTemplateForm
          onSubmit={handleNewTemplateSubmit}
          onCancel={cancelTemplateCreation}
          backgroundColor="#3b82f6"
        />
      );
    }
    
    // For when we're adding a child template task to an existing template
    // For adding a child template to an existing template
    if (addingChildToTemplateId) {
      const parentTask = tasks.find(t => t.id === addingChildToTemplateId);
      if (!parentTask) return null;
      
      const level = getTaskLevel(parentTask, tasks);
      const backgroundColor = getBackgroundColor(level);
      
      return (
        <TemplateTaskForm
          parentTaskId={addingChildToTemplateId}
          onSubmit={handleTemplateTaskSubmit}  // Use specific handler
          onCancel={cancelTemplateCreation}
          backgroundColor={backgroundColor}
          tasks={tasks}
        />
      );
    }
    
    // If there's no selected task, show the empty state
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
    
    // Use our new TemplateDetailsPanel component
    return (
      <TemplateDetailsPanel
        task={selectedTask}
        tasks={tasks}
        onClose={() => setSelectedTaskId(null)}
        onAddTask={handleAddTemplateTask}
        onDeleteTask={handleDeleteTemplate}
        onEditTask={handleEditTemplate}
      />
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
              onClick={() => handleCreateNewTemplate(null)}
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
            <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading your templates...</p>
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
        ) : (
          <div>
            {renderTopLevelTemplates()}
          </div>
        )}
      </div>
      
      {/* Right panel - Template details or task form */}
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

export default TemplateList;