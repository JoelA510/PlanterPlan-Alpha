import React, { useEffect, useState } from 'react';
import './TaskList.css'; // Keep the CSS for drag-and-drop specific styles
import TaskItem from './TaskItem';
import TaskDetailsPanel from './TaskDetailsPanel';
import TaskDropZone from './TaskDropZone';
import TaskForm from '../TaskForm/TaskForm';
import { 
  EmptyPanel, 
  DeleteConfirmation, 
  ProjectForm, 
  TemplateSelector 
} from './TaskUIComponents';
import useTaskDragAndDrop from '../../utils/useTaskDragAndDrop';
import { fetchAllTasks, createTask, updateTaskCompletion, deleteTask } from '../../services/taskService';
import { getBackgroundColor, getTaskLevel } from '../../utils/taskUtils';
import { useOrganization } from '../contexts/OrganizationProvider';
import { useAuth } from '../contexts/AuthContext';

const TaskList = () => {
  // Context hooks
  const { organization, organizationId, loading: orgLoading } = useOrganization();
  const { user, loading: userLoading } = useAuth();
  
  // State hooks
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [addingChildToTaskId, setAddingChildToTaskId] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Project creation states
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

  // Load tasks when org and user are loaded
  useEffect(() => {
    if (!orgLoading && !userLoading) {
      fetchTasks();
    }
  }, [organizationId, user?.id, orgLoading, userLoading]);

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await fetchAllTasks(organizationId, user?.id);
      if (error) throw new Error(error);
      
      const instanceTasks = data ? data.filter(task => task.origin === "instance") : [];
      setTasks(instanceTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(`Failed to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch templates from API
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await fetchAllTasks(organizationId);
      if (error) throw new Error(error);
      
      const templateTasks = data ? data.filter(task => task.origin === "template") : [];
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

  // Toggle task expansion
  const toggleExpandTask = (taskId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };
  
  // Select a task to show in right panel
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
  
  // Get selected task
  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  // Initialize drag and drop
  const dragAndDrop = useTaskDragAndDrop(tasks, setTasks, fetchTasks);
  
  // Toggle task completion
  const toggleTaskCompletion = async (taskId, currentStatus, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const result = await updateTaskCompletion(taskId, currentStatus, organizationId);
      if (!result.success) throw new Error(result.error);
      
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, is_complete: !currentStatus } : task
      ));
    } catch (err) {
      console.error('Error updating task completion:', err);
      alert(`Failed to update task: ${err.message}`);
    }
  };

  // Handle adding child task
  const handleAddChildTask = (parentTaskId) => {
    setSelectedTaskId(parentTaskId);
    setAddingChildToTaskId(parentTaskId);
    setExpandedTasks(prev => ({ ...prev, [parentTaskId]: true }));
  };

  // Handle child task form submission
  const handleAddChildTaskSubmit = async (taskData) => {
    try {
      const siblingTasks = tasks.filter(t => t.parent_task_id === taskData.parent_task_id);
      const position = siblingTasks.length > 0 
        ? Math.max(...siblingTasks.map(t => t.position)) + 1 
        : 0;
      
      const newTaskData = {
        ...taskData,
        position,
        creator: user?.id,
        due_date: taskData.due_date || null
      };
      
      const result = await createTask(newTaskData, organizationId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        setTasks(prev => [...prev, result.data]);
      }
      
      setAddingChildToTaskId(null);
      
      if (taskData.parent_task_id) {
        setExpandedTasks(prev => ({ ...prev, [taskData.parent_task_id]: true }));
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
  
  // Toggle new project dropdown
  const toggleNewProjectDropdown = () => {
    setIsNewProjectDropdownOpen(prev => !prev);
  };
  
  // Handle new project type selection
  const handleNewProjectTypeSelect = async (type) => {
    setNewProjectType(type);
    setIsNewProjectDropdownOpen(false);
    
    if (type === 'template') {
      await fetchTemplates(organizationId);
      setSelectedTaskId(null);
    } else if (type === 'empty') {
      setCreatingProject(true);
      setProjectFormData({
        title: '',
        purpose: '',
        description: '',
        actions: [''],
        resources: [''],
        start_date: null,
        due_date: null
      });
      setSelectedTaskId(null);
    }
  };
  
  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    setCreatingProject(true);
    
    const selectedTemplate = templates.find(t => t.id === templateId);
    
    if (selectedTemplate) {
      setProjectFormData({
        title: `${selectedTemplate.title} - Copy`,
        purpose: selectedTemplate.purpose || '',
        description: selectedTemplate.description || '',
        actions: selectedTemplate.actions?.length > 0 ? [...selectedTemplate.actions] : [''],
        resources: selectedTemplate.resources?.length > 0 ? [...selectedTemplate.resources] : [''],
        start_date: new Date().toISOString().split('T')[0],
        due_date: null
      });
    }
  };
  
  // Handle form field changes
  const handleProjectFormChange = (field, value) => {
    setProjectFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle array type field changes
  const handleProjectArrayChange = (type, index, value) => {
    setProjectFormData(prev => {
      const newArray = [...prev[type]];
      newArray[index] = value;
      return { ...prev, [type]: newArray };
    });
  };
  
  // Add item to an array field
  const addProjectArrayItem = (type) => {
    setProjectFormData(prev => ({ ...prev, [type]: [...prev[type], ''] }));
  };
  
  // Remove item from an array field
  const removeProjectArrayItem = (type, index) => {
    setProjectFormData(prev => {
      const newArray = [...prev[type]];
      newArray.splice(index, 1);
      return { ...prev, [type]: newArray.length === 0 ? [''] : newArray };
    });
  };
  
  // Create a new project
  const handleCreateProject = async () => {
    try {
      if (!projectFormData.title.trim()) {
        alert('Project title is required');
        return;
      }
      
      const projectData = {
        title: projectFormData.title,
        purpose: projectFormData.purpose,
        description: projectFormData.description,
        actions: projectFormData.actions.filter(a => a.trim() !== ''),
        resources: projectFormData.resources.filter(r => r.trim() !== ''),
        due_date: projectFormData.due_date,
        start_date: projectFormData.start_date,
        parent_task_id: null,
        position: tasks.filter(t => !t.parent_task_id).length,
        origin: 'instance',
        is_complete: false,
        creator: user?.id,
      };
      
      const result = await createTask(projectData, organizationId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (newProjectType === 'template' && selectedTemplateId && result.data) {
        await createChildTasksFromTemplate(selectedTemplateId, result.data.id);
      }
      
      await fetchTasks();
      
      setNewProjectType(null);
      setSelectedTemplateId(null);
      setCreatingProject(false);
      
      alert(`Project "${projectData.title}" created successfully!`);
      
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Failed to create project: ${error.message}`);
    }
  };
  
  // Create child tasks from a template
  const createChildTasksFromTemplate = async (templateId, newProjectId) => {
    try {
      const templateTask = templates.find(t => t.id === templateId);
      if (!templateTask) return;
      
      const childTemplates = templates.filter(t => t.parent_task_id === templateId);
      
      for (let i = 0; i < childTemplates.length; i++) {
        const childTemplate = childTemplates[i];
        
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
          due_date: null,
          creator: user?.id,
        };
        
        const result = await createTask(childTaskData, organizationId);
        
        if (result.error) {
          console.error("Error creating child task:", result.error);
          continue;
        }
        
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
      
      const taskToDelete = tasks.find(t => t.id === deletingTaskId);
      if (!taskToDelete) throw new Error("Task not found");
      
      const getAllDescendantTaskIds = (parentId) => {
        const directChildren = tasks.filter(t => t.parent_task_id === parentId);
        const childIds = directChildren.map(t => t.id);
        const grandchildIds = directChildren.flatMap(child => getAllDescendantTaskIds(child.id));
        return [...childIds, ...grandchildIds];
      };
      
      const descendantIds = getAllDescendantTaskIds(deletingTaskId);
      const allIdsToDelete = [deletingTaskId, ...descendantIds];
      
      const result = await deleteTask(deletingTaskId, organizationId);
      
      if (result.error) throw new Error(result.error);
      
      setTasks(prev => prev.filter(t => !allIdsToDelete.includes(t.id)));
      
      if (selectedTaskId === deletingTaskId) {
        setSelectedTaskId(null);
      }
      
      setDeletingTaskId(null);
      setShowDeleteConfirmation(false);
      
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
  
  // Render top-level tasks
  const renderTopLevelTasks = () => {
    const topLevelTasks = tasks
      .filter(task => !task.parent_task_id)
      .sort((a, b) => a.position - b.position);
    
    if (topLevelTasks.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No projects found. Create your first project to get started!
        </div>
      );
    }
    
    return topLevelTasks.map((task, index) => (
      <React.Fragment key={task.id}>
        <TaskItem 
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
        {index < topLevelTasks.length - 1 && <div className="h-1 my-0.5" />}
      </React.Fragment>
    ));
  };
  
  // Determine what to show in the right panel
  const getRightPanelContent = () => {
    // Project creation flow
    if (newProjectType) {
      if (creatingProject) {
        return (
          <ProjectForm
            formData={projectFormData}
            onFieldChange={handleProjectFormChange}
            onArrayChange={handleProjectArrayChange}
            onAddArrayItem={addProjectArrayItem}
            onRemoveArrayItem={removeProjectArrayItem}
            onSubmit={handleCreateProject}
            onCancel={handleCancelProjectCreation}
            backgroundColor={newProjectType === 'template' && selectedTemplateId 
              ? getBackgroundColor(0) : '#3b82f6'}
            formTitle={newProjectType === 'template' 
              ? 'Create Project from Template' : 'Create New Project'}
          />
        );
      }
      
      if (newProjectType === 'template') {
        return (
          <TemplateSelector
            templates={templates.filter(t => !t.parent_task_id)}
            selectedTemplateId={selectedTemplateId}
            onTemplateSelect={handleTemplateSelect}
            onCancel={handleCancelProjectCreation}
            onContinue={() => setCreatingProject(true)}
          />
        );
      }
    }
    
    // Child task form
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
    
    // Task details
    if (selectedTaskId && selectedTask) {
      return (
        <TaskDetailsPanel
          task={selectedTask}
          tasks={tasks}
          toggleTaskCompletion={toggleTaskCompletion}
          onClose={() => setSelectedTaskId(null)}
          onAddChildTask={handleAddChildTask}
          onDeleteTask={handleDeleteTask}
        />
      );
    }
    
    // Empty state
    return <EmptyPanel message="Select a task to view its details" />;
  };

  // Main component render
  return (
    <div className="flex h-[calc(100vh-100px)] relative">
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <DeleteConfirmation
          onConfirm={confirmDeleteTask}
          onCancel={cancelDeleteTask}
          message="Are you sure you want to delete this task? This will also delete all subtasks and cannot be undone."
        />
      )}
      
      {/* Left panel - Task list */}
      <div className="flex-1 flex-grow-6 mr-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <div className="flex gap-3">
            <div className="relative">
              <button 
                onClick={toggleNewProjectDropdown} 
                className="bg-green-500 text-white py-2 px-4 rounded border-0 flex items-center"
              >
                <span className="mr-2">New Project</span>
                <span>{isNewProjectDropdownOpen ? '▲' : '▼'}</span>
              </button>
              
              {isNewProjectDropdownOpen && (
                <div className="absolute top-full right-0 bg-white border border-gray-200 rounded shadow-lg w-52 z-10">
                  <button 
                    onClick={() => handleNewProjectTypeSelect('template')} 
                    className="block w-full text-left py-2 px-4 hover:bg-gray-100 border-0 border-b border-gray-200"
                  >
                    Create from Template
                  </button>
                  <button 
                    onClick={() => handleNewProjectTypeSelect('empty')} 
                    className="block w-full text-left py-2 px-4 hover:bg-gray-100 border-0"
                  >
                    Create Empty Project
                  </button>
                </div>
              )}
            </div>
            
            <button 
              onClick={fetchTasks} 
              className="bg-blue-500 text-white py-2 px-4 rounded border-0"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
            {error}
          </div>
        ) : (
          <div>{renderTopLevelTasks()}</div>
        )}
      </div>
      
      {/* Right panel */}
      <div className="flex-1 flex-grow-4 min-w-75 max-w-125">
        {getRightPanelContent()}
      </div>
      
      {/* Debug panel */}
      <details className="fixed bottom-2.5 left-2.5 p-2 bg-gray-100 bg-opacity-90 rounded border border-gray-200 w-56 max-h-75 overflow-y-auto text-xs z-20 shadow-sm">
        <summary className="cursor-pointer text-blue-500 font-medium text-xs select-none">
          Debug
        </summary>
        <div className="mt-1.5">
          <p>Projects: {tasks.length} (Top: {tasks.filter(t => !t.parent_task_id).length})</p>
          <p>New project: {newProjectType || 'None'}</p>
          <p>Selected template: {selectedTemplateId?.substring(0, 8) || 'None'}</p>
          <p>Selected task: {selectedTaskId ? selectedTaskId.substring(0, 8) + '...' : 'None'}</p>
        </div>
      </details>
    </div>
  );
};

export default TaskList;