import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { fetchAllTasks, createTask, deleteTask as deleteTaskService } from '../../services/taskService';
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
  
  // License system state
  const [canCreateProject, setCanCreateProject] = useState(false);
  const [userHasProjects, setUserHasProjects] = useState(false);
  const [projectLimitReason, setProjectLimitReason] = useState('');
  const [userLicenses, setUserLicenses] = useState([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  
  // Refs for tracking state without triggering re-renders
  const initialFetchDoneRef = useRef(false);
  const lastActivityTimeRef = useRef(Date.now());
  
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
  }, [organizationId, user?.id, instanceTasks, templateTasks]);
  
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
        // const hasProjects = await checkForExistingProjects();

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
      
      // Call the service function
      const result = await createTask(enhancedTaskData, licenseId);
      
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
      }
      
      return { data: result.data, error: null };
    } catch (err) {
      console.error('Error creating task:', err);
      return { data: null, error: err.message };
    }
  }, [user?.id, organizationId, userHasProjects]);
  
  // Delete a task and its children
  const deleteTask = useCallback(async (taskId, deleteChildren = true) => {
    try {
      // Find the task
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) {
        throw new Error('Task not found');
      }
      
      console.log(`Deleting task ${taskId} (with children: ${deleteChildren})`);
      
      // Call service function to delete the task and its children
      const result = await deleteTaskService(taskId, deleteChildren);
      
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
  }, [tasks]);
  
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
      setUserHasProjects(hasProjects); // Add this state variable to the context
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
      const { data, error } = await supabase
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
    deleteTask, // Add deleteTask to the context value
    
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