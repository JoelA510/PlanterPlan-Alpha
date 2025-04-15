import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchAllTasks } from '../../services/taskService';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationProvider';
import { useParams } from 'react-router-dom';

// Create a context for tasks
const TaskContext = createContext();

// Custom hook to use the task context
export const useTasks = () => useContext(TaskContext);

// Internal component to handle task state with access to auth and organization contexts
const TaskState = ({ children }) => {
  const { user, loading: userLoading } = useAuth();
  const { organization, organizationId, loading: orgLoading } = useOrganization();
  
  const [tasks, setTasks] = useState([]);
  const [instanceTasks, setInstanceTasks] = useState([]);
  const [templateTasks, setTemplateTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Function to fetch tasks from API
  const fetchTasks = async (force = false) => {
    // Get the current organization ID and user ID from contexts
    const orgId = organizationId || null;
    const userId = user?.id || null;
    
    // If we have data and it's been less than 5 minutes since last fetch
    // and we're not forcing a refresh and the org ID and user ID haven't changed, return early
    const now = new Date();
    if (
      !force &&
      tasks.length > 0 && 
      lastFetched && 
      (now - lastFetched) < 5 * 60 * 1000 &&
      orgId === currentOrgId &&
      userId === currentUserId
    ) {
      return { instanceTasks, templateTasks };
    }

    try {
      setLoading(true);
      
      // For instance tasks - include user ID filtering
      const { data: instanceData, error: instanceError } = await fetchAllTasks(orgId, userId, 'instance');
      
      // For template tasks - only filter by organization, not by user
      const { data: templateData, error: templateError } = await fetchAllTasks(orgId, null, 'template');

      if (instanceError) throw new Error(instanceError);
      if (templateError) throw new Error(templateError);
      
      // Combine instance and template tasks
      const allTasks = [...(instanceData || []), ...(templateData || [])];
      setTasks(allTasks);
      
      // Set instance tasks
      setInstanceTasks(instanceData || []);
      
      // Set template tasks
      setTemplateTasks(templateData || []);
      
      // Update last fetched timestamp and current IDs
      setLastFetched(now);
      setCurrentOrgId(orgId);
      setCurrentUserId(userId);
      
      return { 
        instanceTasks: instanceData || [], 
        templateTasks: templateData || [] 
      };
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(`Failed to load tasks: ${err.message}`);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks when organization or user changes
  useEffect(() => {
    if (!userLoading && !orgLoading) {
      fetchTasks(true);
    }
  }, [organizationId, user?.id, userLoading, orgLoading]);

  // Add visibility change listener to refetch when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !userLoading && !orgLoading) {
        // Tab has become visible again, refetch data if needed
        fetchTasks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, organizationId, userLoading, orgLoading]);

  // Listen for route changes that might affect organization context
  const RouteObserver = () => {
    const params = useParams();
    
    useEffect(() => {
      // If the route includes an orgSlug parameter, we might need to refresh
      if (params.orgSlug && user?.id) {
        fetchTasks(true);
      }
    }, [params.orgSlug]);
    
    return null;
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      instanceTasks,
      templateTasks,
      loading: loading || userLoading || orgLoading,
      error,
      fetchTasks,
      setTasks: (newTasks) => {
        setTasks(newTasks);
        setInstanceTasks(newTasks.filter(task => task.origin === "instance"));
        setTemplateTasks(newTasks.filter(task => task.origin === "template"));
      }
    }}>
      <RouteObserver />
      {children}
    </TaskContext.Provider>
  );
};

// Provider component that wraps your app
export const TaskProvider = ({ children }) => {
  return (
    <TaskState>
      {children}
    </TaskState>
  );
};

export default TaskContext;