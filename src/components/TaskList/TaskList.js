import React, { useEffect, useState } from 'react';
import './TaskList.css';
import TaskItem from './TaskItem';
import TaskDropZone from './TaskDropZone';
import TaskForm from '../TaskForm/TaskForm';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { fetchAllTasks, createTask, updateTaskCompletion, deleteTask } from '../../services/taskService';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import { useOrganization } from '../contexts/OrganizationProvider';

const TaskList = () => {
  const orgContext = useOrganization();
  const organization = orgContext ? orgContext.organization : null;
  
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [addingChildToTaskId, setAddingChildToTaskId] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // New project creation states
  const [isNewProjectDropdownOpen, setIsNewProjectDropdownOpen] = useState(false);
  const [newProjectType, setNewProjectType] = useState(null); // 'template' or 'empty'
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectFormData, setProjectFormData] = useState({
    title: '',
    purpose: '',
    description: '',
    actions: [''],
    resources: [''],
    start_date: null,
    due_date: null
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      // Pass organization ID if it exists
      const { data, error } = await fetchAllTasks(organization?.id);
      
      if (error) {
        console.error('Error loading tasks:', error);
      } else {
        setTasks(data || []);
      }
      setLoading(false);
    }
    
    loadTasks();
  }, [organization]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await fetchAllTasks();

      if (error) throw new Error(error);
      
      // Filter to only include tasks where origin is "instance"
      const instanceTasks = data ? data.filter(task => task.origin === "instance") : [];
      console.log('Fetched instance tasks:', instanceTasks);
      
      setTasks(instanceTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(`Failed to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await fetchAllTasks();

      if (error) throw new Error(error);
      
      // Filter to only include template tasks
      const templateTasks = data ? data.filter(task => task.origin === "template") : [];
      console.log('Fetched templates:', templateTasks);
      
      // Get only top-level templates
      const topLevelTemplates = templateTasks.filter(template => !template.parent_task_id);
      
      setTemplates(templateTasks);
      
      return templateTasks;
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(`Failed to load templates: ${err.message}`);
      return [];
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
      
      setTasks(prev => 
        prev.map(task => 
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
      
      // Determine position for new task
      const siblingTasks = tasks.filter(t => t.parent_task_id === taskData.parent_task_id);
      const position = siblingTasks.length > 0 
        ? Math.max(...siblingTasks.map(t => t.position)) + 1 
        : 0;
      
      // Add position to task data
      const newTaskData = {
        ...taskData,
        position,
        // Ensure due_date is included (even if null)
        due_date: taskData.due_date || null
      };
      
      console.log("Calling createTask with:", JSON.stringify(newTaskData, null, 2));
      
      // Call API to create task
      const result = await createTask(newTaskData);
      
      if (result.error) {
        console.error("Error from createTask:", result.error);
        throw new Error(result.error);
      }
      
      console.log("Task created successfully:", result.data);
      
      // Update local state with new task
      if (result.data) {
        setTasks(prev => [...prev, result.data]);
      }
      
      // For now, just close the form
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
      alert(`Failed to create task: ${err.message}`);
    }
  };

  // Handle canceling the add child task form
  const handleCancelAddTask = () => {
    setAddingChildToTaskId(null);
  };
  
  // NEW FUNCTIONS FOR PROJECT CREATION
  
  // Toggle the new project dropdown
  const toggleNewProjectDropdown = () => {
    setIsNewProjectDropdownOpen(prev => !prev);
  };
  
  // Handle new project type selection
  const handleNewProjectTypeSelect = async (type) => {
    setNewProjectType(type);
    setIsNewProjectDropdownOpen(false);
    
    if (type === 'template') {
      // If we're creating from template, fetch templates and show template selection
      const fetchedTemplates = await fetchTemplates();
      // Clear any selected task
      setSelectedTaskId(null);
    } else if (type === 'empty') {
      // If creating an empty project, show the project form
      setCreatingProject(true);
      // Reset form data
      setProjectFormData({
        title: '',
        purpose: '',
        description: '',
        actions: [''],
        resources: [''],
        start_date: null,
        due_date: null
      });
      // Clear any selected task
      setSelectedTaskId(null);
    }
  };
  
  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    setCreatingProject(true);
    
    // Find the selected template
    const selectedTemplate = templates.find(t => t.id === templateId);
    
    if (selectedTemplate) {
      // Pre-fill form with template data
      setProjectFormData({
        title: `${selectedTemplate.title} - Copy`,
        purpose: selectedTemplate.purpose || '',
        description: selectedTemplate.description || '',
        actions: selectedTemplate.actions?.length > 0 ? [...selectedTemplate.actions] : [''],
        resources: selectedTemplate.resources?.length > 0 ? [...selectedTemplate.resources] : [''],
        start_date: new Date().toISOString().split('T')[0], // Today's date
        due_date: null
      });
    }
  };
  
  // Handle form field changes
  const handleProjectFormChange = (field, value) => {
    setProjectFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle array type field changes (actions, resources)
  const handleProjectArrayChange = (type, index, value) => {
    setProjectFormData(prev => {
      const newArray = [...prev[type]];
      newArray[index] = value;
      return {
        ...prev,
        [type]: newArray
      };
    });
  };
  
  // Add item to an array field
  const addProjectArrayItem = (type) => {
    setProjectFormData(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }));
  };
  
  // Remove item from an array field
  const removeProjectArrayItem = (type, index) => {
    setProjectFormData(prev => {
      const newArray = [...prev[type]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [type]: newArray.length === 0 ? [''] : newArray
      };
    });
  };
  
  // Create a new project with the filled form data
  const handleCreateProject = async () => {
    try {
      // Validate form
      if (!projectFormData.title.trim()) {
        alert('Project title is required');
        return;
      }
      
      // Prepare project data
      const projectData = {
        title: projectFormData.title,
        purpose: projectFormData.purpose,
        description: projectFormData.description,
        actions: projectFormData.actions.filter(a => a.trim() !== ''),
        resources: projectFormData.resources.filter(r => r.trim() !== ''),
        due_date: projectFormData.due_date,
        start_date: projectFormData.start_date,
        parent_task_id: null, // Top-level project
        position: tasks.filter(t => !t.parent_task_id).length, // Position at the end
        origin: 'instance',
        is_complete: false
      };
      
      // Call API to create project
      const result = await createTask(projectData);
      
      if (result.error) {
        console.error("Error creating project:", result.error);
        throw new Error(result.error);
      }
      
      // If we're creating from a template, we also need to create child tasks
      if (newProjectType === 'template' && selectedTemplateId && result.data) {
        await createChildTasksFromTemplate(selectedTemplateId, result.data.id);
      }
      
      // Refresh task list
      await fetchTasks();
      
      // Reset states
      setNewProjectType(null);
      setSelectedTemplateId(null);
      setCreatingProject(false);
      
      // Alert success
      alert(`Project "${projectData.title}" created successfully!`);
      
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Failed to create project: ${error.message}`);
    }
  };
  
  // Create child tasks from a template
  const createChildTasksFromTemplate = async (templateId, newProjectId) => {
    try {
      // Find the template and its children
      const templateTask = templates.find(t => t.id === templateId);
      if (!templateTask) return;
      
      // Get direct children of the template
      const childTemplates = templates.filter(t => t.parent_task_id === templateId);
      
      // Create each child task
      for (let i = 0; i < childTemplates.length; i++) {
        const childTemplate = childTemplates[i];
        
        // Create the child task
        const childTaskData = {
          title: childTemplate.title,
          purpose: childTemplate.purpose,
          description: childTemplate.description,
          actions: Array.isArray(childTemplate.actions) ? childTemplate.actions : [],
          resources: Array.isArray(childTemplate.resources) ? childTemplate.resources : [],
          parent_task_id: newProjectId,
          position: i,
          origin: 'instance',
          is_complete: false,
          due_date: null
        };
        
        const result = await createTask(childTaskData);
        
        if (result.error) {
          console.error("Error creating child task:", result.error);
          continue;
        }
        
        // Recursively create child tasks of this child
        const grandchildTemplates = templates.filter(t => t.parent_task_id === childTemplate.id);
        if (grandchildTemplates.length > 0) {
          await createChildTasksFromTemplate(childTemplate.id, result.data.id);
        }
      }
    } catch (error) {
      console.error('Error creating child tasks from template:', error);
    }
  };
  
  // Cancel project creation
  const handleCancelProjectCreation = () => {
    setNewProjectType(null);
    setSelectedTemplateId(null);
    setCreatingProject(false);
  };
  
  // Handle task deletion
  const handleDeleteTask = (taskId) => {
    setDeletingTaskId(taskId);
    setShowDeleteConfirmation(true);
  };
  
  // Confirm and execute task deletion
  const confirmDeleteTask = async () => {
    try {
      if (!deletingTaskId) return;
      
      // Find the task to delete
      const taskToDelete = tasks.find(t => t.id === deletingTaskId);
      if (!taskToDelete) throw new Error("Task not found");
      
      // Get all descendant tasks (children, grandchildren, etc.)
      const getAllDescendantTaskIds = (parentId) => {
        const directChildren = tasks.filter(t => t.parent_task_id === parentId);
        const childIds = directChildren.map(t => t.id);
        
        // Recursively get grandchildren
        const grandchildIds = directChildren.flatMap(child => 
          getAllDescendantTaskIds(child.id)
        );
        
        return [...childIds, ...grandchildIds];
      };
      
      const descendantIds = getAllDescendantTaskIds(deletingTaskId);
      const allIdsToDelete = [deletingTaskId, ...descendantIds];
      
      console.log(`Deleting task ${taskToDelete.title} and ${descendantIds.length} descendants`);
      
      // Call the delete API
      const result = await deleteTask(deletingTaskId);
      
      if (result.error) throw new Error(result.error);
      
      // Update local state
      setTasks(prev => prev.filter(t => !allIdsToDelete.includes(t.id)));
      
      // If we're deleting the currently selected task, clear the selection
      if (selectedTaskId === deletingTaskId) {
        setSelectedTaskId(null);
      }
      
      // Reset deletion state
      setDeletingTaskId(null);
      setShowDeleteConfirmation(false);
      
      // Show success message
      alert(`Successfully deleted "${taskToDelete.title}" and all its subtasks`);
      
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(`Failed to delete task: ${error.message}`);
    } finally {
      setShowDeleteConfirmation(false);
    }
  };
  
  // Cancel task deletion
  const cancelDeleteTask = () => {
    setDeletingTaskId(null);
    setShowDeleteConfirmation(false);
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
  
  // Render template selection in the right panel
  const renderTemplateSelection = () => {
    // Get top-level templates
    const topLevelTemplates = templates.filter(t => !t.parent_task_id);
    
    return (
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        height: '100%',
        overflow: 'auto'
      }}>
        <div style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '16px',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontWeight: 'bold' }}>
              Select a Template
            </h3>
            <button 
              onClick={handleCancelProjectCreation}
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
        
        <div style={{ padding: '16px' }}>
          <p style={{ marginBottom: '16px' }}>
            Choose a template to use as the basis for your new project:
          </p>
          
          {topLevelTemplates.length === 0 ? (
            <div style={{ 
              color: '#6b7280',
              textAlign: 'center',
              padding: '24px'
            }}>
              No templates available. You can create a template from the Templates page.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topLevelTemplates.map(template => {
                const bgColor = getBackgroundColor(0); // Top level
                
                return (
                  <div 
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    style={{
                      backgroundColor: bgColor,
                      color: 'white',
                      padding: '12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      border: selectedTemplateId === template.id 
                        ? '2px solid white' 
                        : '2px solid transparent',
                      boxShadow: selectedTemplateId === template.id 
                        ? `0 0 0 2px ${bgColor}` 
                        : 'none',
                    }}
                  >
                    {template.title}
                  </div>
                );
              })}
            </div>
          )}
          
          {selectedTemplateId && (
            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button
                onClick={() => setCreatingProject(true)}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render project creation form
  const renderProjectForm = () => {
    const bgColor = newProjectType === 'template' && selectedTemplateId 
      ? getBackgroundColor(0)  // Use template color if creating from template
      : '#3b82f6';            // Default blue for empty projects
    
    return (
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        height: '100%',
        overflow: 'auto'
      }}>
        <div style={{
          backgroundColor: bgColor,
          color: 'white',
          padding: '16px',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontWeight: 'bold' }}>
              {newProjectType === 'template' 
                ? 'Create Project from Template' 
                : 'Create New Project'}
            </h3>
            <button 
              onClick={handleCancelProjectCreation}
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
        
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="title"
              style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '4px' 
              }}
            >
              Project Title *
            </label>
            <input
              id="title"
              type="text"
              value={projectFormData.title}
              onChange={(e) => handleProjectFormChange('title', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                outline: 'none'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="purpose"
              style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '4px' 
              }}
            >
              Purpose
            </label>
            <textarea
              id="purpose"
              value={projectFormData.purpose}
              onChange={(e) => handleProjectFormChange('purpose', e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="description"
              style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '4px' 
              }}
            >
              Description
            </label>
            <textarea
              id="description"
              value={projectFormData.description}
              onChange={(e) => handleProjectFormChange('description', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label 
                  htmlFor="start_date"
                  style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '4px' 
                  }}
                >
                  Start Date
                </label>
                <input
                  id="start_date"
                  type="date"
                  value={projectFormData.start_date || ''}
                  onChange={(e) => handleProjectFormChange('start_date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <label 
                  htmlFor="due_date"
                  style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '4px' 
                  }}
                >
                  Due Date
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={projectFormData.due_date || ''}
                  onChange={(e) => handleProjectFormChange('due_date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label 
              style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '4px' 
              }}
            >
              Actions
            </label>
            {projectFormData.actions.map((action, index) => (
              <div key={`action-${index}`} style={{ 
                display: 'flex', 
                marginBottom: '8px',
                alignItems: 'center' 
              }}>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => handleProjectArrayChange('actions', index, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    outline: 'none'
                  }}
                  placeholder="Enter an action step"
                />
                <button
                  type="button"
                  onClick={() => removeProjectArrayItem('actions', index)}
                  style={{
                    marginLeft: '8px',
                    padding: '8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#f3f4f6',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addProjectArrayItem('actions')}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontSize: '12px'
              }}
            >
              <span style={{ marginRight: '4px' }}>Add Action</span>
              <span>+</span>
            </button>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label 
              style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '4px' 
              }}
            >
              Resources
            </label>
            {projectFormData.resources.map((resource, index) => (
              <div key={`resource-${index}`} style={{ 
                display: 'flex', 
                marginBottom: '8px',
                alignItems: 'center' 
              }}>
                <input
                  type="text"
                  value={resource}
                  onChange={(e) => handleProjectArrayChange('resources', index, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    outline: 'none'
                  }}
                  placeholder="Enter a resource"
                />
                <button
                  type="button"
                  onClick={() => removeProjectArrayItem('resources', index)}
                  style={{
                    marginLeft: '8px',
                    padding: '8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#f3f4f6',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addProjectArrayItem('resources')}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontSize: '12px'
              }}
            >
              <span style={{ marginRight: '4px' }}>Add Resource</span>
              <span>+</span>
            </button>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={handleCancelProjectCreation}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateProject}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                background: '#10b981',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the right panel content (task details, task form, template selection, or project form)
  const renderRightPanel = () => {
    // If we're in the project creation flow
    if (newProjectType) {
      // Show the project form if we're at that step
      if (creatingProject) {
        return renderProjectForm();
      }
      
      // Otherwise, if we're creating from template, show template selection
      if (newProjectType === 'template') {
        return renderTemplateSelection();
      }
    }
    
    // If there's a child task form
    if (addingChildToTaskId) {
      const task = tasks.find(t => t.id === addingChildToTaskId);
      if (!task) return null;
      
      const level = getTaskLevel(task, tasks);
      const backgroundColor = getBackgroundColor(level);
      
      return (
        <TaskForm
          parentTaskId={addingChildToTaskId}
          onSubmit={handleAddChildTaskSubmit}
          onCancel={handleCancelAddTask}
          backgroundColor={backgroundColor}
          originType="instance"
        />
      );
    }
    
    // If a task is selected, show its details
    if (selectedTaskId) {
      const task = tasks.find(t => t.id === selectedTaskId);
      if (!task) return null;
      
      const level = getTaskLevel(task, tasks);
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
                {Array.isArray(task.actions) && task.actions.length > 0 ? 
                  task.actions.map((action, index) => (
                    <li key={index}>{action}</li>
                  )) : 
                  <li>No actions specified</li>
                }
              </ul>
            </div>
            
            <div className="detail-row">
              <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Resources:</h4>
              <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
                {Array.isArray(task.resources) && task.resources.length > 0 ? 
                  task.resources.map((resource, index) => (
                    <li key={index}>{resource}</li>
                  )) : 
                  <li>No resources specified</li>
                }
              </ul>
            </div>
            
            {/* Action buttons in details panel */}
            <div className="detail-row" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
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
                  flex: '1'
                }}
              >
                <span style={{ marginRight: '8px' }}>Add Child Task</span>
                <span>+</span>
              </button>
              
              <button
                onClick={() => handleDeleteTask(task.id)}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: 'none',
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
    }
    
    // If nothing is selected, show the empty state
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
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', position: 'relative' }}>
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ marginTop: 0, color: '#ef4444' }}>Confirm Deletion</h3>
            <p>
              Are you sure you want to delete this task? This will also delete all subtasks and cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={cancelDeleteTask}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Delete
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
            <div style={{ position: 'relative' }}>
              <button 
                onClick={toggleNewProjectDropdown}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ marginRight: '8px' }}>New Project</span>
                <span>{isNewProjectDropdownOpen ? '▲' : '▼'}</span>
              </button>
              
              {isNewProjectDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  width: '200px',
                  zIndex: 10
                }}>
                  <button
                    onClick={() => handleNewProjectTypeSelect('template')}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                  >
                    Create from Template
                  </button>
                  <button
                    onClick={() => handleNewProjectTypeSelect('empty')}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Create Empty Project
                  </button>
                </div>
              )}
            </div>
            
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
            No projects found. Create your first project to get started!
          </div>
        ) : (
          <div>{renderTopLevelTasks()}</div>
        )}
      </div>
      
      {/* Right panel - Task details, Task form, Template selection, or Project form */}
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
          <p>New project type: {newProjectType || 'None'}</p>
          <p>Selected template: {selectedTemplateId || 'None'}</p>
          <p>Creating project: {creatingProject ? 'Yes' : 'No'}</p>
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