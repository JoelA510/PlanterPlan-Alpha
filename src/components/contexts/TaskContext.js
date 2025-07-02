import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationProvider';
import { useLicenses } from '../../hooks/useLicenses';
import { useTaskCreation } from '../../hooks/useTaskCreation';
import { useTemplateToProject } from '../../hooks/useTemplateToProject';
import { useTaskDeletion } from '../../hooks/useTaskDeletion';
import { useTaskUpdate } from '../../hooks/useTaskUpdate';
import { useLocation } from 'react-router-dom';
import { useTaskDates } from '../../hooks/useTaskDates';
import { fetchAllTasks, updateTaskCompletion } from '../../services/taskService';

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
  const { organizationId, loading: orgLoading } = useOrganization();
  
  // Core state - just the tasks array and fetching state
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const initialFetchDoneRef = useRef(false);

  // Helper function to get project start date
  const getProjectStartDate = useCallback(() => {
    const rootTasks = tasks.filter(t => !t.parent_task_id);
    const projectWithStartDate = rootTasks.find(t => t.start_date);
    return projectWithStartDate?.start_date || new Date().toISOString().split('T')[0];
  }, [tasks]);

  // Derived task arrays
  const instanceTasks = useMemo(() => 
    tasks.filter(task => task.origin === "instance"), [tasks]
  );
  
  const templateTasks = useMemo(() => 
    tasks.filter(task => task.origin === "template"), [tasks]
  );

  // Fetch all tasks
  const fetchTasks = useCallback(async (forceRefresh = false) => {
    if (isFetching && !forceRefresh) return { instanceTasks, templateTasks };
    if (!user?.id) return { instanceTasks, templateTasks };
    
    try {
      setIsFetching(true);
      setLoading(true);
      
      const [instanceResult, templateResult] = await Promise.all([
        fetchAllTasks(organizationId, user.id, 'instance'),
        fetchAllTasks(organizationId, null, 'template')
      ]);
      
      const allTasks = [...(instanceResult.data || []), ...(templateResult.data || [])];
      setTasks(allTasks);
      setError(null);
      initialFetchDoneRef.current = true;
      
      return { 
        instanceTasks: instanceResult.data || [], 
        templateTasks: templateResult.data || [] 
      };
    } catch (err) {
      setError(`Failed to load tasks: ${err.message}`);
      return { error: err.message, instanceTasks, templateTasks };
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [organizationId, user?.id, instanceTasks, templateTasks, isFetching]);

  // Initialize date management system
  const dateHookResult = useTaskDates(tasks, getProjectStartDate());

  // Initialize all operation hooks with integration callbacks
  const creationHookResult = useTaskCreation();
  const templateHookResult = useTemplateToProject();
  const deletionHookResult = useTaskDeletion();
  const updateHookResult = useTaskUpdate();
  const licenseHookResult = useLicenses();

  // Integration callbacks for hooks (simplified - removed drag/drop callbacks)
  const integrationCallbacks = useMemo(() => ({
    // For task creation
    onTaskCreated: async (newTask) => {
      setTasks(prev => [...prev, newTask]);
      const affectedTaskIds = [newTask.id];
      if (newTask.parent_task_id) {
        const siblings = tasks
          .filter(t => t.parent_task_id === newTask.parent_task_id)
          .filter(t => (t.position || 0) >= (newTask.position || 0));
        affectedTaskIds.push(...siblings.map(t => t.id));
      }
      await dateHookResult.updateTaskDates(affectedTaskIds);
    },

    // For template conversion
    onProjectCreated: async (rootProject, createdTasks) => {
      setTasks(prev => [...prev, ...createdTasks]);
      setTimeout(() => fetchTasks(true), 1000);
    },

    // For task deletion
    onTasksDeleted: async (deletedIds) => {
      console.log(`Tasks deleted successfully: ${deletedIds.length} tasks`);
    },
    onTasksUpdated: async (updatedTasks) => {
      setTasks(updatedTasks);
    },

    // For task updates
    onTaskUpdated: async (updatedTask) => {
      setTasks(prev => prev.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
    },
    onRefreshNeeded: async () => {
      await fetchTasks(true);
    }
  }), [tasks, fetchTasks, dateHookResult.updateTaskDates]);

  // Create enhanced hook functions with integration
  const createTask = useCallback(async (taskData, licenseId = null) => {
    return await creationHookResult.createTask(taskData, {
      licenseId,
      existingTasks: tasks,
      onTaskCreated: integrationCallbacks.onTaskCreated
    });
  }, [creationHookResult.createTask, tasks, integrationCallbacks.onTaskCreated]);

  const createProjectFromTemplate = useCallback(async (templateId, projectData, licenseId = null) => {
    return await templateHookResult.createProjectFromTemplate(templateId, projectData, {
      licenseId,
      templateTasks,
      onProjectCreated: integrationCallbacks.onProjectCreated
    });
  }, [templateHookResult.createProjectFromTemplate, templateTasks, integrationCallbacks.onProjectCreated]);

  const deleteTask = useCallback(async (taskId, deleteChildren = true) => {
    return await deletionHookResult.deleteTask(taskId, {
      deleteChildren,
      existingTasks: tasks,
      onTasksDeleted: integrationCallbacks.onTasksDeleted,
      onTasksUpdated: integrationCallbacks.onTasksUpdated
    });
  }, [deletionHookResult.deleteTask, tasks, integrationCallbacks.onTasksDeleted, integrationCallbacks.onTasksUpdated]);

  const updateTask = useCallback(async (taskId, updatedTaskData) => {
    return await updateHookResult.updateTask(taskId, updatedTaskData, {
      existingTasks: tasks,
      onTaskUpdated: integrationCallbacks.onTaskUpdated,
      onTasksUpdated: integrationCallbacks.onTasksUpdated,
      onRefreshNeeded: integrationCallbacks.onRefreshNeeded
    });
  }, [updateHookResult.updateTask, tasks, integrationCallbacks]);

  const updateTaskDates = useCallback(async (taskId, dateData) => {
    return await updateHookResult.updateTaskDates(taskId, dateData, {
      existingTasks: tasks,
      onTaskUpdated: integrationCallbacks.onTaskUpdated
    });
  }, [updateHookResult.updateTaskDates, tasks, integrationCallbacks]);

  // Initial fetch
  useEffect(() => {
    if (!userLoading && !orgLoading && !initialFetchDoneRef.current && user?.id) {
      fetchTasks();
    }
  }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks]);

  // Create the context value - simplified without drag/drop complexity
  const contextValue = useMemo(() => ({
    // Core task data
    tasks,
    instanceTasks,
    templateTasks,
    loading,
    error,
    isFetching,
    fetchTasks,
    setTasks, // Expose setTasks for direct manipulation in TaskList

    // Task operations (integrated with state management)
    createTask,
    updateTask,
    deleteTask,
    updateTaskDates,
    createProjectFromTemplate,

    // Direct access to all hook state and functions
    ...creationHookResult,
    ...templateHookResult,
    ...deletionHookResult,
    ...updateHookResult,
    ...dateHookResult,
    ...licenseHookResult,

    // Legacy function for compatibility
    updateTaskCompletion,
    
    // Utility
    determineTaskStartDate: (task) => dateHookResult.getTaskStartDate(task.id)
  }), [
    // Core state
    tasks,
    instanceTasks,
    templateTasks,
    loading,
    error,
    isFetching,
    fetchTasks,

    // Integrated operations
    createTask,
    updateTask,
    deleteTask,
    updateTaskDates,
    createProjectFromTemplate,

    // All hook results
    creationHookResult,
    templateHookResult,
    deletionHookResult,
    updateHookResult,
    dateHookResult,
    licenseHookResult
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext;