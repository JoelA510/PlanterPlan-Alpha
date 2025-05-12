import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationProvider';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  canUserCreateProject, 
  validateLicense,
  markLicenseAsUsed,
  checkUserExistingProjects,

} from '../../services/licenseService';

// Import functions from taskService directly if you're not using useTaskService
import { 
  fetchAllTasks, 
  createTask, 
  updateTaskPosition, 
  updateSiblingPositions, 
  updateTaskCompletion,
  deleteTask,
  updateTaskDateFields,
  updateTaskComplete, 
} from '../../services/taskService';

// Import the date utility functions
import { 
  calculateDueDate,
  calculateStartDate,
  updateDependentTaskDates
} from '../../utils/dateUtils';


// Create a context for tasks
const TaskContext = createContext();

// Custom hook to use the task context
export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

// Provider component that wraps your app
export const TaskProvider = ({ children }) => {
  const { user, loading: userLoading } = useAuth();
  const { organization, organizationId, loading: orgLoading } = useOrganization();
  const location = useLocation();
  
  // State for tasks
  const [tasks, setTasks] = useState([]);
  const [instanceTasks, setInstanceTasks] = useState([]);
  const [templateTasks, setTemplateTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const isMountedRef = useRef(true);
  
  // Template management state
  const [addingTemplateToId, setAddingTemplateToId] = useState(null);
  const [isAddingTopLevelTemplate, setIsAddingTopLevelTemplate] = useState(false);
  
  // License system state
  const [canCreateProject, setCanCreateProject] = useState(false);
  const [userHasProjects, setUserHasProjects] = useState(false);
  const [projectLimitReason, setProjectLimitReason] = useState('');
  const [userLicenses, setUserLicenses] = useState([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  
  // Refs for tracking state without triggering re-renders
  const initialFetchDoneRef = useRef(false);
  
  // Update tasks state safely - DEFINE THIS FIRST since it's used by other functions
  const updateTasks = useCallback((newTasks) => {
    // Ensure newTasks is an array
    if (!Array.isArray(newTasks)) {
      console.error('updateTasks received non-array value:', newTasks);
      return;
    }

    try {
      // Group tasks by origin
      const instance = newTasks.filter(task => task.origin === "instance");
      const template = newTasks.filter(task => task.origin === "template");
      
      // Debug log
      console.log('updateTasks called with', newTasks.length, 'tasks');
      console.log('Instance tasks:', instance.length);
      console.log('Template tasks:', template.length);

      // Update all task states
      setTasks(newTasks);
      setInstanceTasks(instance);
      setTemplateTasks(template);
    } catch (err) {
      console.error('Error in updateTasks:', err);
    }
  }, []);
  
  // Fetch all tasks (both instances and templates)
  const fetchTasks = useCallback(async (forceRefresh = false) => {
    // Skip if already fetching or missing required IDs
    if (isFetching && !forceRefresh) {
      console.log('Already fetching tasks, skipping this request');
      return { instanceTasks, templateTasks };
    }
    
    if (!user?.id) {
      console.warn('Missing user ID, skipping fetch');
      return { instanceTasks, templateTasks };
    }
    
    try {
      setIsFetching(true);
      setLoading(true);
      
      console.log('Fetching tasks with params:', { organizationId, userId: user.id });
      
      // Fetch instance tasks - filter by user AND organization
      const instanceResult = await fetchAllTasks(organizationId, user.id, 'instance');
      
      // Fetch template tasks - filter by organization only (not by user)
      const templateResult = await fetchAllTasks(organizationId, null, 'template');
      
      const instanceData = instanceResult.data || [];
      const templateData = templateResult.data || [];
      
      if (instanceResult.error) {
        console.error('Error fetching instance tasks:', instanceResult.error);
      }
      
      if (templateResult.error) {
        console.error('Error fetching template tasks:', templateResult.error);
      }
      
      // If both requests failed, throw an error
      if (instanceResult.error && templateResult.error) {
        throw new Error(`Failed to fetch tasks: ${instanceResult.error}`);
      }
      
      console.log('Fetch complete:', {
        instanceCount: instanceData.length,
        templateCount: templateData.length
      });
      
      // Update state with new data
      setInstanceTasks(instanceData);
      setTemplateTasks(templateData);
      setTasks([...instanceData, ...templateData]);
      setError(null);
      
      // Mark initial fetch as complete
      initialFetchDoneRef.current = true;
      
      
      return { instanceTasks: instanceData, templateTasks: templateData };
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(`Failed to load tasks: ${err.message}`);
      return { error: err.message, instanceTasks, templateTasks };
    } finally {
      setLoading(false);
      setIsFetching(false);
      setInitialLoading(false);
    }
  }, [organizationId, user?.id, instanceTasks, templateTasks]);
  
  // Create a new task with date handling
  const createNewTask = useCallback(async (taskData, licenseId = null) => {
    try {
      console.log('Creating task with data:', taskData);
      console.log('License key', licenseId);
      
      if (!user?.id) {
        throw new Error('Cannot create task: User ID is missing');
      }
      
      // Check if this is a top-level project creation
      const isTopLevelProject = !taskData.parent_task_id && taskData.origin === "instance";
      
      // For top-level projects, check if the user already has projects
      if (isTopLevelProject) {
        // If user has projects but no license is provided, block creation
        if (userHasProjects && !licenseId) {
          throw new Error('You already have a project. Please provide a license key to create additional projects.');
        }
      }
      
      // Handle date calculations
      let enhancedTaskData = {
        ...taskData,
        creator: user.id,
        origin: taskData.origin || "instance",
        white_label_id: organizationId,
        license_id: licenseId
      };
      
      // If this is a child task and has days_from_start_until set
      if (taskData.parent_task_id && taskData.days_from_start_until_due !== undefined) {
        // Find the parent task
        const parentTask = tasks.find(t => t.id === taskData.parent_task_id);
        
        if (parentTask && parentTask.start_date) {
          // Calculate start date based on parent's start date and days_from_start_until
          const calculatedStartDate = calculateStartDate(
            parentTask.start_date,
            taskData.days_from_start_until_due
          );
          
          if (calculatedStartDate) {
            // Format as ISO string for database
            enhancedTaskData.start_date = calculatedStartDate.toISOString();
            
            // If task has a default_duration, calculate the due date
            if (taskData.default_duration) {
              const calculatedDueDate = calculateDueDate(
                calculatedStartDate,
                taskData.default_duration
              );
              
              if (calculatedDueDate) {
                enhancedTaskData.due_date = calculatedDueDate.toISOString();
              }
            }
          }
        }
      }
      // If this task has start_date and default_duration but no due_date
      else if (taskData.start_date && taskData.default_duration && !taskData.due_date) {
        const calculatedDueDate = calculateDueDate(
          taskData.start_date,
          taskData.default_duration
        );
        
        if (calculatedDueDate) {
          enhancedTaskData.due_date = calculatedDueDate.toISOString();
        }
      }
      
      console.log('Enhanced task data:', enhancedTaskData);
      
      // Use the createTask function
      const result = await createTask(enhancedTaskData);
      
      if (result.error) {
        console.error('Error from createTask API:', result.error);
        throw new Error(result.error);
      }
      
      console.log('Task created successfully:', result.data);
      
      if (result.data) {
        // Add the new task to the appropriate list based on origin
        if (result.data.origin === "instance") {
          setInstanceTasks(prev => [...prev, result.data]);
        } else if (result.data.origin === "template") {
          setTemplateTasks(prev => [...prev, result.data]);
        }
        
        // Update the combined tasks list
        setTasks(prev => [...prev, result.data]);
        
        // Update dates for child tasks if any dates changed in the parent
        if (taskData.parent_task_id) {
          // Update dates for all tasks under the parent
          const updatedTasks = updateDependentTaskDates(
            taskData.parent_task_id,
            [...tasks, result.data]
          );
          
          // Update all task arrays with the recalculated dates
          updateTasks(updatedTasks);
          
          // Update affected tasks in database
          for (const updatedTask of updatedTasks) {
            // Skip the newly created task (already saved with correct dates)
            if (updatedTask.id === result.data.id) continue;
            
            // Only update tasks with changed dates
            const originalTask = tasks.find(t => t.id === updatedTask.id);
            if (originalTask && (
              originalTask.start_date !== updatedTask.start_date ||
              originalTask.due_date !== updatedTask.due_date
            )) {
              await updateTaskDateFields(updatedTask.id, {
                start_date: updatedTask.start_date,
                due_date: updatedTask.due_date
              });
            }
          }
        }
        
        
        // Reset template creation state
        setAddingTemplateToId(null);
        setIsAddingTopLevelTemplate(false);
      }
      
      return { data: result.data, error: null };
    } catch (err) {
      console.error('Error creating task:', err);
      return { data: null, error: err.message };
    }
  }, [user?.id, organizationId, userHasProjects, tasks, updateTasks]);
  
// This should be placed INSIDE the TaskProvider component function, NOT at the top level
const updateTaskHandler = async (taskId, updatedTaskData) => {
  try {
    // Call the updateTaskComplete service function
    const result = await updateTaskComplete(taskId, updatedTaskData);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update task');
    }
    
    // Update the state with the modified task
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, ...result.data } : task
      )
    );
    
    // If the task has children, its date changes may affect them
    if (result.data.start_date || result.data.due_date) {
      const childTasks = tasks.filter(t => t.parent_task_id === taskId);
      if (childTasks.length > 0) {
        // Recalculate dates for all tasks under this parent
        const tasksWithUpdatedDates = updateDependentTaskDates(
          taskId,
          tasks.map(t => t.id === taskId ? { ...t, ...result.data } : t)
        );
        
        // Update all tasks with the recalculated dates
        updateTasks(tasksWithUpdatedDates);
      }
    }
    
    return { success: true, data: result.data };
  } catch (err) {
    console.error('Error updating task:', err);
    return { success: false, error: err.message };
  }
};  
// Add the updateTa

  // Update a task's date fields
  const updateTaskDates = useCallback(async (taskId, dateData) => {
    try {
      console.log('Updating task dates:', taskId, dateData);
      
      // Find the task to update
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) {
        throw new Error('Task not found');
      }
      
      // Calculate due date if start_date and default_duration are provided but due_date is not
      let enhancedDateData = { ...dateData };
      
      if (dateData.start_date && dateData.default_duration && !dateData.due_date) {
        const calculatedDueDate = calculateDueDate(
          dateData.start_date,
          dateData.default_duration
        );
        
        if (calculatedDueDate) {
          enhancedDateData.due_date = calculatedDueDate.toISOString();
        }
      }
      
      // Update the task in the database
      const result = await updateTaskDateFields(taskId, enhancedDateData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the task in local state
      const updatedTask = { ...taskToUpdate, ...enhancedDateData };
      
      // Create updated task lists
      const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
      
      // If this task has children, we need to update their dates too
      const hasChildren = tasks.some(t => t.parent_task_id === taskId);
      
      if (hasChildren) {
        // Recalculate dates for all child tasks
        const tasksWithUpdatedDates = updateDependentTaskDates(taskId, updatedTasks);
        
        // Update all tasks in the state
        updateTasks(tasksWithUpdatedDates);
        
        // Update child tasks in database
        const childTasks = tasksWithUpdatedDates.filter(t => t.parent_task_id === taskId);
        
        for (const childTask of childTasks) {
          const originalChild = tasks.find(t => t.id === childTask.id);
          
          // Only update if dates actually changed
          if (originalChild && (
            originalChild.start_date !== childTask.start_date ||
            originalChild.due_date !== childTask.due_date
          )) {
            await updateTaskDateFields(childTask.id, {
              start_date: childTask.start_date,
              due_date: childTask.due_date
            });
          }
        }
      } else {
        // No children, just update this task
        updateTasks(updatedTasks);
      }
      
      return { success: true, data: updatedTask };
    } catch (err) {
      console.error('Error updating task dates:', err);
      return { success: false, error: err.message };
    }
  }, [tasks, updateTasks]);
  
  // Template-specific functions
  
  // Handle adding a template (either top-level or child)
  const handleAddTemplate = useCallback((parentId = null) => {
    if (parentId) {
      setAddingTemplateToId(parentId);
      setIsAddingTopLevelTemplate(false);
    } else {
      setIsAddingTopLevelTemplate(true);
      setAddingTemplateToId(null);
    }
  }, []);
  
  // Cancel adding a template
  const cancelAddTemplate = useCallback(() => {
    setAddingTemplateToId(null);
    setIsAddingTopLevelTemplate(false);
  }, []);
  
  // Create a template with proper position calculation
  const createTemplate = useCallback(async (templateData) => {
    try {
      console.log("Creating template with data:", JSON.stringify(templateData, null, 2));
      
      // Determine position for new template
      let position = 0;
      
      if (templateData.parent_task_id) {
        const siblingTemplates = templateTasks.filter(t => 
          t.parent_task_id === templateData.parent_task_id
        );
        position = siblingTemplates.length > 0 
          ? Math.max(...siblingTemplates.map(t => t.position || 0)) + 1 
          : 0;
      } else {
        const topLevelTemplates = templateTasks.filter(t => !t.parent_task_id);
        position = topLevelTemplates.length > 0 
          ? Math.max(...topLevelTemplates.map(t => t.position || 0)) + 1 
          : 0;
      }
      
      // Add position and origin to template data
      const enhancedTemplateData = {
        ...templateData,
        position,
        origin: 'template'
      };
      
      // Call create task function
      return await createNewTask(enhancedTemplateData);
    } catch (err) {
      console.error('Error creating template:', err);
      return { error: err.message };
    }
  }, [templateTasks, createNewTask]);
  
  // Delete a task and its children
  const deleteTaskHandler = useCallback(async (taskId, deleteChildren = true) => {
    try {
      // Find the task
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) {
        throw new Error('Task not found');
      }
      
      console.log(`Deleting task ${taskId} (with children: ${deleteChildren})`);
      
      // Store parent ID to update dates for siblings later
      const parentId = taskToDelete.parent_task_id;
      
      // Use the deleteTask function
      const result = await deleteTask(taskId, deleteChildren);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Remove all deleted tasks from local state
      if (result.deletedIds && Array.isArray(result.deletedIds)) {
        // Update all task arrays
        setTasks(prev => prev.filter(task => !result.deletedIds.includes(task.id)));
        setInstanceTasks(prev => prev.filter(task => !result.deletedIds.includes(task.id)));
        setTemplateTasks(prev => prev.filter(task => !result.deletedIds.includes(task.id)));
        
        console.log(`Deleted ${result.deletedIds.length} tasks`);
        
        // If this was a top-level project, refresh project creation ability
        if (!taskToDelete.parent_task_id) {

        }
        // Otherwise, update sibling positions and dates
        else if (parentId) {
          // Get remaining siblings
          const remainingSiblings = tasks
            .filter(t => !result.deletedIds.includes(t.id))
            .filter(t => t.parent_task_id === parentId)
            .sort((a, b) => a.position - b.position);
          
          // Update sibling positions
          if (remainingSiblings.length > 0) {
            const updatedSiblings = remainingSiblings.map((task, index) => ({
              id: task.id,
              position: index
            }));
            
            await updateSiblingPositions(updatedSiblings);
            
            // Also update dates for the parent's child tasks
            const tasksWithUpdatedDates = updateDependentTaskDates(
              parentId,
              tasks.filter(t => !result.deletedIds.includes(t.id))
            );
            
            // Update local state with new dates
            updateTasks(tasksWithUpdatedDates);
          }
        }
      }
      
      return { 
        success: true, 
        deletedIds: result.deletedIds,
        hasChildren: result.deletedIds && result.deletedIds.length > 1
      };
    } catch (err) {
      console.error('Error deleting task:', err);
      return { success: false, error: err.message };
    }
  // }, [tasks, updateTasks, checkProjectCreationAbility]);
  }, [tasks, updateTasks]);
  
  // License system functions
  
  // Check if user can create a new project
  const checkForExistingProjects = useCallback(async () => {
    if (!user?.id) return false;
    
    try {
      const { hasProjects } = await checkUserExistingProjects(user.id);
      setUserHasProjects(hasProjects);
      return hasProjects;
    } catch (error) {
      console.error('Error checking for existing projects:', error);
      return false;
    }
  }, [user?.id]);
  
  // Fetch all licenses for the current user
  const fetchUserLicenses = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log("Fetching user licenses");
      let { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      setUserLicenses(data || []);
      console.log(data);
    } catch (error) {
      console.error('Error fetching user licenses:', error);
    }
  }, [user?.id]);
  
  // Apply a license key to the user's account
  const applyLicenseKey = useCallback(async (licenseKey) => {
    if (!user?.id) {
      console.error('License application failed: No user ID available');
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      console.log('Validating license key', { licenseKey: licenseKey, userId: user.id });
      const result = await validateLicense(licenseKey, user.id);
      console.log('License validation result', result, result.data.id);
      
      if (result.success) {
        try {
          const markedLicenseRes = await markLicenseAsUsed(result.data.id);
          console.log('License marked as used successfully');
          if (markedLicenseRes.success) {
            
            return { 
              success: true, 
              licenseId: result.data.id
            };
          } else {
            console.error('Failed to mark license as used', markedLicenseRes.error);
            // Continue despite this error since validation succeeded
            return { 
              success: false, 
              error: result.error 
            };
          }
        } catch (error) {
          console.error('Failed during marking license as used', error );
          return { 
            success: false, 
            error: error.message || 'An unexpected error occurred'
          };
        }
      } else {
        console.error('License validation failed', { error: result.error });
        return { 
          success: false, 
          error: result.error 
        };
      }
    } catch (error) {
      console.error('Unexpected error during license application', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      };
    }
  }, [user?.id]);
  
  // Select a license for a new project
  const selectLicense = useCallback((licenseId) => {
    setSelectedLicenseId(licenseId);
  }, []);

  // Function to create a new project from a template
const createProjectFromTemplate = useCallback(async (templateId, projectData, licenseId = null) => {
  try {
    console.log('Creating project from template:', templateId);
    
    if (!user?.id) {
      throw new Error('Cannot create project: User ID is missing');
    }
    
    if (!templateId) {
      throw new Error('Template ID is required');
    }
    
    // Find the template to clone
    const template = templateTasks.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
    
    // Prepare the initial project data
    const projectBaseData = {
      title: projectData.name || template.title,
      description: template.description,
      purpose: template.purpose,
      actions: template.actions || [],
      resources: template.resources || [],
      origin: 'instance',
      is_complete: false,
      creator: user.id,
      white_label_id: organizationId,
      license_id: licenseId,
      start_date: projectData.startDate || new Date().toISOString(),
      parent_task_id: null, // Top-level project
      position: 0, // Will be at the top of the projects list
      default_duration: template.default_duration
    };
    
    // If the template has a due date or default_duration, calculate the new project's due date
    if (projectBaseData.start_date && template.default_duration) {
      const calculatedDueDate = calculateDueDate(
        projectBaseData.start_date,
        template.default_duration
      );
      
      if (calculatedDueDate) {
        projectBaseData.due_date = calculatedDueDate.toISOString();
      }
    }
    
    // Create the top-level project
    const result = await createTask(projectBaseData, licenseId);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Store the created project
    const newProject = result.data;
    
    // Now recursively clone all child templates
    const cloneChildren = async (parentTemplateId, parentProjectId) => {
      // Find all child templates
      const childTemplates = templateTasks.filter(t => t.parent_task_id === parentTemplateId);
      
      // Clone each child template
      for (const childTemplate of childTemplates) {
        // Prepare child task data
        const childData = {
          title: childTemplate.title,
          description: childTemplate.description,
          purpose: childTemplate.purpose,
          actions: childTemplate.actions || [],
          resources: childTemplate.resources || [],
          origin: 'instance',
          is_complete: false,
          creator: user.id,
          white_label_id: organizationId,
          parent_task_id: parentProjectId,
          position: childTemplate.position || 0,
          days_from_start_until_due: childTemplate.days_from_start_until_due,
          default_duration: childTemplate.default_duration
        };
        
        // Create the child task
        const childResult = await createTask(childData);
        
        if (childResult.error) {
          console.error('Error creating child task:', childResult.error);
          continue; // Continue with other children even if one fails
        }
        
        // Recursively clone this child's children
        await cloneChildren(childTemplate.id, childResult.data.id);
      }
    };
    
    // Start the recursive cloning process
    await cloneChildren(templateId, newProject.id);
    
    // Refresh tasks to include the new project
    await fetchTasks(true);
    
    return { data: newProject, error: null };
  } catch (err) {
    console.error('Error creating project from template:', err);
    return { data: null, error: err.message };
  }
}, [user?.id, organizationId, templateTasks, createTask, fetchTasks]);
  
  
  // Initial fetch when component mounts
  useEffect(() => {
    if (userLoading || orgLoading) {
      return;
    }
    
    if (!initialFetchDoneRef.current && user?.id) {
      fetchTasks();
      // fetchUserLicenses();
      checkForExistingProjects();
    }
  // }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks, checkProjectCreationAbility, fetchUserLicenses, checkForExistingProjects]);
  }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks, checkForExistingProjects]);
  
  useEffect(() => {
    // Set the ref to true on mount
    isMountedRef.current = true;
    
    // Clean up function to set ref to false on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create the context value
  const contextValue = {
    // Task management
    tasks,
    instanceTasks,
    templateTasks,
    loading,
    initialLoading,
    error,
    fetchTasks,
    setTasks: updateTasks,
    createTask: createNewTask,
    deleteTask: deleteTaskHandler,
    // Date-specific functions
    updateTaskDates,
    // Expose additional task service functions directly
    updateTaskPosition,
    updateSiblingPositions,
    updateTaskCompletion,
    
    // Template management
    addingTemplateToId,
    isAddingTopLevelTemplate,
    handleAddTemplate,
    cancelAddTemplate,
    createTemplate,
    
    // License system
    canCreateProject,
    projectLimitReason,
    // userLicenses,
    selectedLicenseId,
    userHasProjects,
    isCheckingLicense,
    fetchUserLicenses,
    applyLicenseKey,
    selectLicense,
    // getSelectedLicense,
    setTasks: updateTasks,
    createTask: createNewTask,
    deleteTask: deleteTaskHandler,
    updateTask: updateTaskHandler, 
    createProjectFromTemplate,
  };
  
  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext;