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

// Import the taskService hook instead of individual functions
import { useTaskService } from '../../services/taskService';

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
  
  // Use the taskService hook to get reconnection-capable functions
  const taskService = useTaskService();
  
  // State for tasks
  const [tasks, setTasks] = useState([]);
  const [instanceTasks, setInstanceTasks] = useState([]);
  const [templateTasks, setTemplateTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  
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
      
      // Use the taskService functions from the hook
      // Fetch instance tasks - filter by user AND organization
      const instanceResult = await taskService.fetchAllTasks(organizationId, user.id, 'instance');
      
      // Fetch template tasks - filter by organization only (not by user)
      const templateResult = await taskService.fetchAllTasks(organizationId, null, 'template');
      
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
      
      // Also check project creation ability after fetching tasks
      checkProjectCreationAbility();
      
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
  }, [organizationId, user?.id, instanceTasks, templateTasks, taskService]);
  
  // Create a new task
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
      // Enhance task data with necessary fields
      const enhancedTaskData = {
        ...taskData,
        creator: user.id,
        origin: taskData.origin || "instance", // Default to instance if not specified
        white_label_id: organizationId, // Automatically add the white_label_id here
        license_id: licenseId // Include license ID if provided
      };
      
      console.log('Enhanced task data:', enhancedTaskData);
      
      // Use the taskService createTask function
      const result = await taskService.createTask(enhancedTaskData);
      
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
        
        // If this was a top-level project, refresh the project creation ability
        if (isTopLevelProject) {
          checkProjectCreationAbility();
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
  }, [user?.id, organizationId, userHasProjects, taskService]);
  
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
  const deleteTask = useCallback(async (taskId, deleteChildren = true) => {
    try {
      // Find the task
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) {
        throw new Error('Task not found');
      }
      
      console.log(`Deleting task ${taskId} (with children: ${deleteChildren})`);
      
      // Use the taskService deleteTask function
      const result = await taskService.deleteTask(taskId, deleteChildren);
      
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
          checkProjectCreationAbility();
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
  }, [tasks, taskService]);
  
  // Update task position
  const updateTaskPosition = useCallback(async (taskId, parentId, position) => {
    return await taskService.updateTaskPosition(taskId, parentId, position);
  }, [taskService]);
  
  // Update sibling positions
  const updateSiblingPositions = useCallback(async (tasks) => {
    return await taskService.updateSiblingPositions(tasks);
  }, [taskService]);
  
  // Update task completion status
  const updateTaskCompletion = useCallback(async (taskId, currentStatus) => {
    return await taskService.updateTaskCompletion(taskId, currentStatus);
  }, [taskService]);
  
  // Update tasks state safely
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
  
  // License system functions
  
  // Check if user can create a new project
  const checkProjectCreationAbility = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsCheckingLicense(true);
      const result = await canUserCreateProject(user.id);
      
      setCanCreateProject(result.canCreate);
      setProjectLimitReason(result.reason);
      
      if (result.licenses) {
        // This only includes unused licenses, so we'll fetch all separately
        fetchUserLicenses();
      }
    } catch (error) {
      console.error('Error checking project creation ability:', error);
      setCanCreateProject(false);
      setProjectLimitReason('Error checking project creation ability');
    } finally {
      setIsCheckingLicense(false);
    }
  }, [user?.id]);

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
  
  // Get the currently selected license
  const getSelectedLicense = useCallback(() => {
    if (!selectedLicenseId) return null;
    return userLicenses.find(license => license.id === selectedLicenseId);
  }, [selectedLicenseId, userLicenses]);
  
  // Initial fetch when component mounts
  useEffect(() => {
    if (userLoading || orgLoading) {
      return;
    }
    
    if (!initialFetchDoneRef.current && user?.id) {
      fetchTasks();
      checkProjectCreationAbility();
      fetchUserLicenses();
      checkForExistingProjects();
    }
  }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks, checkProjectCreationAbility, fetchUserLicenses, checkForExistingProjects]);
  
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
    deleteTask,
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
    userLicenses,
    selectedLicenseId,
    userHasProjects,
    isCheckingLicense,
    checkProjectCreationAbility,
    fetchUserLicenses,
    applyLicenseKey,
    selectLicense,
    getSelectedLicense,
  };
  
  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext;