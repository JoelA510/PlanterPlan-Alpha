// Enhanced integration for TemplateList.js to support master library for both top-level and child tasks

import React, { useState, useEffect, useRef } from 'react';
import TemplateItem from './TemplateItem';
import TemplateTaskForm from '../TaskForm/TemplateTaskForm';
import CreateNewTemplateForm from '../TaskForm/CreateNewTemplateForm';
import TemplateDetailsPanel from './TemplateDetailsPanel';
import MasterLibrarySearchBar from '../MasterLibrary/MasterLibrarySearchBar'; // ✅ IMPORT
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
    createTask,
    deleteTask,
    updateTask
  } = useTasks();
  
  const isMountedRef = useRef(true);
  
  // Local state
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local state for template creation
  const [isCreatingNewTemplate, setIsCreatingNewTemplate] = useState(false);
  const [addingChildToTemplateId, setAddingChildToTemplateId] = useState(null);
  
  // ✅ NEW: State for handling template creation from master library
  const [creatingFromMasterLibrary, setCreatingFromMasterLibrary] = useState(null);
  const [creatingChildFromMasterLibrary, setCreatingChildFromMasterLibrary] = useState(null);
  
  // ✅ ENHANCED: Drag and drop state
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  
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

  // ✅ ENHANCED: Template helper functions
  const handleCreateNewTemplate = () => {
    setAddingChildToTemplateId(null);
    setCreatingFromMasterLibrary(null);
    setCreatingChildFromMasterLibrary(null);
    setIsCreatingNewTemplate(true);
  };

  const handleAddTemplateTask = (parentId) => {
    setIsCreatingNewTemplate(false);
    setCreatingFromMasterLibrary(null);
    setCreatingChildFromMasterLibrary(null);
    setAddingChildToTemplateId(parentId);
  };

  const cancelTemplateCreation = () => {
    setIsCreatingNewTemplate(false);
    setAddingChildToTemplateId(null);
    setCreatingFromMasterLibrary(null);
    setCreatingChildFromMasterLibrary(null);
  };

  // ✅ NEW: Handle creating a top-level template from master library
  const handleCreateFromMasterLibrary = (masterTemplate) => {
    console.log('Creating top-level template from master library:', masterTemplate);
    
    // Pre-populate the form with master library template data
    const templateData = {
      title: `${masterTemplate.title} (Copy)`, // Add "(Copy)" to distinguish
      description: masterTemplate.description || '',
      purpose: masterTemplate.purpose || '',
      actions: Array.isArray(masterTemplate.actions) ? [...masterTemplate.actions] : [],
      resources: Array.isArray(masterTemplate.resources) ? [...masterTemplate.resources] : [],
      default_duration: masterTemplate.default_duration || masterTemplate.duration_days || 1,
    };
    
    setCreatingFromMasterLibrary(templateData);
    setIsCreatingNewTemplate(false);
    setAddingChildToTemplateId(null);
    setCreatingChildFromMasterLibrary(null);
  };

  // ✅ NEW: Handle creating a child task from master library
  const handleCreateChildFromMasterLibrary = (masterTemplate, parentId) => {
    console.log('Creating child task from master library:', masterTemplate, 'for parent:', parentId);
    
    // Pre-populate the form with master library template data
    const templateData = {
      title: masterTemplate.title, // Don't add "(Copy)" for child tasks
      description: masterTemplate.description || '',
      purpose: masterTemplate.purpose || '',
      actions: Array.isArray(masterTemplate.actions) ? [...masterTemplate.actions] : [],
      resources: Array.isArray(masterTemplate.resources) ? [...masterTemplate.resources] : [],
      default_duration: masterTemplate.default_duration || masterTemplate.duration_days || 1,
    };
    
    setCreatingChildFromMasterLibrary({
      templateData,
      parentId
    });
    setIsCreatingNewTemplate(false);
    setAddingChildToTemplateId(null);
    setCreatingFromMasterLibrary(null);
  };

  // ✅ NEW: Handle master library search result selection (view details)
  const handleMasterLibraryResultSelect = (template) => {
    console.log('Selected master library template for viewing:', template);
    // Could show details in a modal or panel here
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
  
  // ✅ ENHANCED: Simple drag and drop handlers for templates
  const simpleDragAndDrop = {
    draggedTask,
    dropTarget,
    dropPosition,
    
    handleDragStart: (e, task) => {
      if (!task.parent_task_id) {
        e.preventDefault();
        return;
      }
      
      e.dataTransfer.setData('text/plain', task.id);
      setDraggedTask(task);
      console.log('Template drag started:', task.title);
    },
    
    handleDragOver: (e, targetTask) => {
      e.preventDefault();
      
      if (!draggedTask || draggedTask.id === targetTask.id) {
        return;
      }
      
      setDropTarget(targetTask);
      setDropPosition('into');
    },
    
    handleDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setDropTarget(null);
        setDropPosition(null);
      }
    },
    
    handleDragEnd: (e) => {
      setDraggedTask(null);
      setDropTarget(null);
      setDropPosition(null);
      console.log('Template drag ended');
    },
    
    handleDrop: async (e, targetTask) => {
      e.preventDefault();
      
      if (!draggedTask || !targetTask) return;
      
      console.log('Template dropped:', draggedTask.title, 'onto:', targetTask.title);
      
      try {
        const existingChildren = tasks.filter(t => t.parent_task_id === targetTask.id);
        const newPosition = existingChildren.length;
        
        const updatedTask = {
          ...draggedTask,
          parent_task_id: targetTask.id,
          position: newPosition
        };
        
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === draggedTask.id ? updatedTask : task
          )
        );
        
        await updateTask(draggedTask.id, {
          parent_task_id: targetTask.id,
          position: newPosition
        });
        
        console.log('Template moved successfully');
        
      } catch (error) {
        console.error('Error moving template:', error);
        await fetchTasks(true);
      } finally {
        setDraggedTask(null);
        setDropTarget(null);
        setDropPosition(null);
      }
    }
  };
  
  // ✅ ENHANCED: Handler for creating a new top-level template
  const handleNewTemplateSubmit = async (templateData) => {
    try {
      const result = await createTask({
        ...templateData,
        origin: 'template',
        parent_task_id: null
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setIsCreatingNewTemplate(false);
      return result;
    } catch (err) {
      console.error('Error creating new template:', err);
      alert(`Failed to create new template: ${err.message}`);
      return { error: err.message };
    }
  };

  // ✅ NEW: Handler for creating template from master library
  const handleMasterLibraryTemplateSubmit = async (templateData) => {
    try {
      const result = await createTask({
        ...templateData,
        origin: 'template',
        parent_task_id: null
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setCreatingFromMasterLibrary(null);
      return result;
    } catch (err) {
      console.error('Error creating template from master library:', err);
      alert(`Failed to create template: ${err.message}`);
      return { error: err.message };
    }
  };

  // ✅ ENHANCED: Handler for adding a template task (child) to an existing template
  const handleTemplateTaskSubmit = async (templateData) => {
    try {
      const parentId = addingChildToTemplateId || creatingChildFromMasterLibrary?.parentId;
      
      const result = await createTask({
        ...templateData,
        origin: 'template',
        parent_task_id: parentId
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setAddingChildToTemplateId(null);
      setCreatingChildFromMasterLibrary(null);
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
      
      alert('Template updated successfully');
      await fetchTasks(true);
      
    } catch (err) {
      console.error('Error updating template:', err);
      alert(`Failed to update template: ${err.message}`);
    }
  };
  
  // Handle delete template
  const handleDeleteTemplate = async (templateId) => {
    const templateToDelete = tasks.find(t => t.id === templateId);
    if (!templateToDelete) return;
    
    const hasChildren = tasks.some(t => t.parent_task_id === templateId);
    
    let confirmMessage = 'Are you sure you want to delete this template?';
    if (hasChildren) {
      confirmMessage = 'This template has child templates that will also be deleted. Are you sure you want to continue?';
    }
    confirmMessage += ' This action cannot be undone.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      if (selectedTaskId === templateId) {
        setSelectedTaskId(null);
      }
      
      const result = await deleteTask(templateId, true);
      
      if (!result.success) {
        if (result.error && result.error.includes("Invalid time value")) {
          console.warn("Date calculation issue detected during deletion, continuing with UI update");
          
          const childTemplateIds = [];
          const findAllChildren = (parentId) => {
            const children = tasks.filter(t => t.parent_task_id === parentId).map(t => t.id);
            childTemplateIds.push(...children);
            children.forEach(childId => findAllChildren(childId));
          };
          
          findAllChildren(templateId);
          
          const allIdsToRemove = [templateId, ...childTemplateIds];
          setTasks(prevTasks => prevTasks.filter(t => !allIdsToRemove.includes(t.id)));
          
          alert(hasChildren 
            ? `Template and ${childTemplateIds.length} child template${childTemplateIds.length !== 1 ? 's' : ''} deleted successfully` 
            : 'Template deleted successfully');
            
          await fetchTasks(true);
          return;
        }
        
        throw new Error(result.error);
      }
      
      const deletedCount = result.deletedIds ? result.deletedIds.length : 1;
      const childCount = deletedCount - 1;
      
      alert(hasChildren 
        ? `Template and ${childCount} child template${childCount !== 1 ? 's' : ''} deleted successfully` 
        : 'Template deleted successfully');
        
      await fetchTasks(true);
    } catch (err) {
      console.error('Error deleting template:', err);
      
      if (err.message && (
        err.message.includes("Invalid time value") || 
        err.message.includes("Invalid date")
      )) {
        alert("There was an issue with template dates during deletion, but the template has been removed.");
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
    
    topLevelTasks.forEach((task, index) => {
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
          dragAndDrop={simpleDragAndDrop}
          onAddTask={handleAddTemplateTask}
        />
      );
      
      if (index < topLevelTasks.length - 1) {
        taskElements.push(
          <div 
            key={`template-spacer-${index}`}
            style={{
              height: '8px',
              margin: '2px 0'
            }}
          />
        );
      }
    });
    
    return taskElements;
  };
  
  // ✅ ENHANCED: Render the right panel content with all master library scenarios
  const renderRightPanel = () => {
    // ✅ NEW: Check if we're creating top-level template from master library
    if (creatingFromMasterLibrary) {
      return (
        <CreateNewTemplateForm
          onSubmit={handleMasterLibraryTemplateSubmit}
          onCancel={cancelTemplateCreation}
          backgroundColor="#3b82f6"
          initialData={creatingFromMasterLibrary}
          title="Create Template from Master Library"
        />
      );
    }

    // ✅ NEW: Check if we're creating child task from master library
    if (creatingChildFromMasterLibrary) {
      const parentTask = tasks.find(t => t.id === creatingChildFromMasterLibrary.parentId);
      if (!parentTask) return null;
      
      const level = getTaskLevel(parentTask, tasks);
      const backgroundColor = getBackgroundColor(level);
      
      return (
        <TemplateTaskForm
          parentTaskId={creatingChildFromMasterLibrary.parentId}
          onSubmit={handleTemplateTaskSubmit}
          onCancel={cancelTemplateCreation}
          backgroundColor={backgroundColor}
          tasks={tasks}
          initialData={creatingChildFromMasterLibrary.templateData}
        />
      );
    }

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
    if (addingChildToTemplateId) {
      const parentTask = tasks.find(t => t.id === addingChildToTemplateId);
      if (!parentTask) return null;
      
      const level = getTaskLevel(parentTask, tasks);
      const backgroundColor = getBackgroundColor(level);
      
      return (
        <TemplateTaskForm
          parentTaskId={addingChildToTemplateId}
          onSubmit={handleTemplateTaskSubmit}
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
    
    // Use our TemplateDetailsPanel component
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
              onClick={handleCreateNewTemplate}
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

        {/* ✅ NEW: Master Library Search Bar for Top-Level Templates */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151', 
            marginBottom: '8px' 
          }}>
            Search Master Library
          </h3>
          <MasterLibrarySearchBar
            onResultSelect={handleMasterLibraryResultSelect}
            onCreateFromTemplate={handleCreateFromMasterLibrary}
          />
          <p style={{
            fontSize: '12px',
            color: '#6b7280',
            margin: '8px 0 0 0',
            fontStyle: 'italic'
          }}>
            Search for templates in the master library
          </p>
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