import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { fetchAllTasks } from '../../services/taskService';
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

// Internal component to handle task state with access to auth and organization contexts
const TaskState = ({ children }) => {
  console.log('⚠️ TaskContext mounting');
  
  const { user, loading: userLoading } = useAuth();
  const { organization, organizationId, loading: orgLoading } = useOrganization();
  const location = useLocation();
  
  // Debug initial state
  console.log('Initial TaskContext state:', { 
    userLoading, 
    orgLoading, 
    userId: user?.id, 
    organizationId,
    path: location.pathname
  });
  
  // Use refs to compare previous values without triggering re-renders
  const prevOrgIdRef = useRef(null);
  const prevUserIdRef = useRef(null);
  const prevPathRef = useRef(null);
  const isMountedRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  
  const [tasks, setTasks] = useState([]);
  const [instanceTasks, setInstanceTasks] = useState([]);
  const [templateTasks, setTemplateTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

  // Stabilize these values with refs to prevent dependency changes
  const userIdRef = useRef(user?.id);
  const orgIdRef = useRef(organizationId);
  const pathRef = useRef(location.pathname);
  
  // Update refs when values change
  useEffect(() => {
    const prevId = userIdRef.current;
    userIdRef.current = user?.id;
    if (prevId !== user?.id) {
      console.log('User ID changed:', { from: prevId, to: user?.id });
    }
  }, [user?.id]);
  
  useEffect(() => {
    const prevId = orgIdRef.current;
    orgIdRef.current = organizationId;
    if (prevId !== organizationId) {
      console.log('Organization ID changed:', { from: prevId, to: organizationId });
    }
  }, [organizationId]);
  
  useEffect(() => {
    const prevPath = pathRef.current;
    pathRef.current = location.pathname;
    if (prevPath !== location.pathname) {
      console.log('Path changed:', { from: prevPath, to: location.pathname });
    }
  }, [location.pathname]);

  // Force initialLoading to false after a timeout (safety measure)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initialLoading) {
        console.log('⚠️ Force releasing initialLoading after timeout');
        setInitialLoading(false);
      }
    }, 5000); // 5 second safety timeout
    
    return () => clearTimeout(timer);
  }, [initialLoading]);

  // Check if key data is loaded
  useEffect(() => {
    console.log('Auth/org loading state:', { userLoading, orgLoading });
    
    if (!userLoading && !orgLoading) {
      console.log('Auth/org data available:', { 
        userId: user?.id, 
        orgId: organizationId,
        userPresent: !!user, 
        orgPresent: !!organizationId,
        organizationName: organization?.organization_name || organization?.name
      });
      
      // Is either missing?
      if (!user?.id) {
        console.warn('⚠️ Missing user ID even though auth is loaded');
      }
      if (!organizationId) {
        console.warn('⚠️ Missing organization ID even though org is loaded');
      }
    }
  }, [userLoading, orgLoading, user, organizationId, organization]);

  // Improved fetch tasks function
  const fetchTasks = useCallback(async (force = false, isInitialFetch = false) => {
    // Prevent concurrent fetches
    if (isFetching) {
      console.log('Already fetching tasks, skipping this request');
      return;
    }
    
    console.log('⚠️ fetchTasks called with:', { force, isInitialFetch });
    
    // Get current values from refs to ensure stability
    const orgId = orgIdRef.current;
    const userId = userIdRef.current;
    const path = pathRef.current;
    
    console.log('Current IDs:', { userId, orgId, path });
    
    // Skip fetch if we don't have necessary IDs
    if (!orgId) {
      console.warn('Missing organization ID, using default');
      // Continue anyway with a default org ID since we've set one in OrganizationProvider
    }
    
    if (!userId && !isInitialFetch) {
      console.warn('Missing user ID, skipping fetch');
      return;
    }
    
    // Check if we need to fetch based on various conditions
    const now = new Date();
    const timeSinceLastFetch = lastFetched ? (now - lastFetched) : Infinity;
    const orgChanged = orgId !== prevOrgIdRef.current;
    const userChanged = userId !== prevUserIdRef.current;
    const pathChanged = path !== prevPathRef.current;
    
    // Skip fetch if conditions don't warrant it
    if (
      !force &&
      !isInitialFetch &&
      tasks.length > 0 && 
      lastFetched && 
      timeSinceLastFetch < 2 * 60 * 1000 &&
      !orgChanged &&
      !userChanged && 
      !pathChanged
    ) {
      console.log('Using cached data - no fetch needed');
      // We still need to set initialLoading to false if it's still true
      if (initialLoading) {
        setInitialLoading(false);
      }
      return { instanceTasks, templateTasks };
    }
    
    try {
      setIsFetching(true);
      setLoading(true);
      
      console.log('Fetching task data from API...');
      console.log('Fetch params:', { orgId, userId });
      
      // For instance tasks - ALWAYS include user ID filtering
      // Default to empty array if the API fails due to missing IDs
      let instanceData = [], instanceError = null;
      
      try {
        const result = await fetchAllTasks(orgId, userId, 'instance');
        instanceData = result.data || [];
        instanceError = result.error;
      } catch (err) {
        console.error('Error fetching instance tasks:', err);
        instanceError = err.message;
      }
      
      // For template tasks - only filter by organization, not by user
      // Default to empty array if the API fails
      let templateData = [], templateError = null;
      
      try {
        const result = await fetchAllTasks(orgId, null, 'template');
        templateData = result.data || [];
        templateError = result.error;
      } catch (err) {
        console.error('Error fetching template tasks:', err);
        templateError = err.message;
      }
      
      // Only throw if both requests failed
      if (instanceError && templateError) {
        throw new Error(`Failed to fetch tasks: ${instanceError}`);
      }
      
      console.log('Fetch successful:', { 
        instanceCount: instanceData?.length || 0, 
        templateCount: templateData?.length || 0 
      });
      
      // Only update state if we're still mounted and the user/org hasn't changed during fetch
      if (
        userIdRef.current === userId && 
        (orgIdRef.current === orgId || !orgId) // Allow missing orgId
      ) {
        // Update state with new data
        const allTasks = [...(instanceData || []), ...(templateData || [])];
        setTasks(allTasks);
        setInstanceTasks(instanceData || []);
        setTemplateTasks(templateData || []);
        
        // Update tracking variables
        setLastFetched(now);
        prevOrgIdRef.current = orgId;
        prevUserIdRef.current = userId;
        prevPathRef.current = path;
        
        if (isInitialFetch) {
          initialFetchDoneRef.current = true;
        }
      } else {
        console.log('User or org changed during fetch, discarding results');
      }
      
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
      setIsFetching(false);
      setInitialLoading(false); // Always set initialLoading to false when fetch completes
    }
  }, [lastFetched, tasks.length, instanceTasks, templateTasks, initialLoading]);

  // Wait for auth and org to load before initial fetch
  useEffect(() => {
    // Skip if still loading auth or org data
    if (userLoading || orgLoading) {
      console.log('Auth or org still loading, waiting for data...');
      return;
    }
    
    console.log('Auth and org data loaded, preparing for initial fetch');
    console.log('Current state:', { 
      userId: user?.id, 
      orgId: organizationId, 
      initialFetchDone: initialFetchDoneRef.current
    });
    
    // Only do initial fetch once
    if (!initialFetchDoneRef.current) {
      console.log('Performing initial fetch');
      prevOrgIdRef.current = organizationId;
      prevUserIdRef.current = user?.id;
      prevPathRef.current = location.pathname;
      isMountedRef.current = true;
      
      // Schedule initial fetch with a slight delay to ensure all hooks are settled
      setTimeout(() => {
        fetchTasks(true, true);
      }, 50);
    }
  }, [organizationId, user?.id, userLoading, orgLoading, location.pathname, fetchTasks]);

  // Handle changes to critical dependencies after initial load
  useEffect(() => {
    // Skip if initial fetch hasn't happened or auth/org still loading
    if (!initialFetchDoneRef.current || userLoading || orgLoading) {
      return;
    }
    
    // Only fetch if critical values have changed
    const orgChanged = organizationId !== prevOrgIdRef.current;
    const userChanged = user?.id !== prevUserIdRef.current;
    const pathChanged = location.pathname !== prevPathRef.current;
    
    if (orgChanged || userChanged || pathChanged) {
      console.log('Critical dependency changed - fetching tasks');
      console.log('Changes:', { orgChanged, userChanged, pathChanged });
      fetchTasks(true, false);
    }
  }, [
    organizationId, 
    user?.id, 
    location.pathname, 
    userLoading, 
    orgLoading, 
    fetchTasks
  ]);

  // Add visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !userLoading && !orgLoading) {
        console.log('Tab became visible - checking if fetch is needed');
        fetchTasks(false, false); // Don't force on visibility change
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchTasks, userLoading, orgLoading]);

  // Helper function to update the tasks state safely
  const updateTasks = useCallback((newTasks) => {
    console.log('Updating tasks state with:', { taskCount: newTasks.length });
    setTasks(newTasks);
    setInstanceTasks(newTasks.filter(task => task.origin === "instance"));
    setTemplateTasks(newTasks.filter(task => task.origin === "template"));
  }, []);

  // Create the context value object
  const contextValue = {
    tasks,
    instanceTasks,
    templateTasks,
    loading: loading || userLoading || orgLoading,
    initialLoading: initialLoading || userLoading || orgLoading,
    error,
    fetchTasks: (force = false) => fetchTasks(force, false),
    setTasks: updateTasks
  };

  return (
    <TaskContext.Provider value={contextValue}>
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