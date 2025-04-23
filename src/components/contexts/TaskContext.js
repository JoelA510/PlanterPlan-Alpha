import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { fetchAllTasks, createTask } from '../../services/taskService';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationProvider';
import { useLocation } from 'react-router-dom';

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
const createNewTask = useCallback(async (taskData) => {
  try {
    console.log('Creating task with data:', taskData);
    
    if (!user?.id) {
      throw new Error('Cannot create task: User ID is missing');
    }
    
    // Enhance task data with necessary fields
    const enhancedTaskData = {
      ...taskData,
      creator: user.id,
      origin: taskData.origin || "instance", // Default to instance if not specified
      white_label_id: organizationId // Automatically add the white_label_id here
    };
    
    console.log('Enhanced task data:', enhancedTaskData);
    
    // Call the service function
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
    }
    
    return { data: result.data, error: null };
  } catch (err) {
    console.error('Error creating task:', err);
    return { data: null, error: err.message };
  }
}, [user?.id, organizationId]);
  
  // Update tasks state safely
  const updateTasks = useCallback((newTasks) => {
    // Group tasks by origin
    const instance = newTasks.filter(task => task.origin === "instance");
    const template = newTasks.filter(task => task.origin === "template");
    
    setTasks(newTasks);
    setInstanceTasks(instance);
    setTemplateTasks(template);
  }, []);
  
  // Initial fetch when component mounts
  useEffect(() => {
    if (userLoading || orgLoading) {
      return;
    }
    
    if (!initialFetchDoneRef.current && user?.id) {
      fetchTasks();
    }
  }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks]);
  
  // Create the context value
  const contextValue = {
    tasks,
    instanceTasks,
    templateTasks,
    loading,
    initialLoading,
    error,
    fetchTasks,
    setTasks: updateTasks,
    createTask: createNewTask
  };
  
  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext;