import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationProvider';
import { useLicenses } from '../../hooks/useLicenses';
import { useTaskCreation } from '../../hooks/useTaskCreation';
import { useTemplateToProject } from '../../hooks/useTemplateToProject';
import { useTaskDeletion } from '../../hooks/useTaskDeletion';
import { useTaskUpdate } from '../../hooks/useTaskUpdate';
import { useTaskDragDrop } from '../../hooks/useTaskDragDrop';
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
  const dragDropHookResult = useTaskDragDrop();
  const licenseHookResult = useLicenses();

  // Integration callbacks for hooks
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
    },

    // For drag and drop
    onTasksRefreshed: async () => {
      await fetchTasks(true);
    },
    onDateRecalculationNeeded: async (affectedTaskIds) => {
      await dateHookResult.updateTaskDates(affectedTaskIds);
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
      onTaskUpdated: integrationCallbacks.onTaskUpdated,
      onDateRecalculationNeeded: integrationCallbacks.onDateRecalculationNeeded
    });
  }, [updateHookResult.updateTaskDates, tasks, integrationCallbacks]);

  const updateTaskAfterDragDrop = useCallback(async (taskId, newParentId, newPosition, oldParentId) => {
    return await dragDropHookResult.updateTaskAfterDragDrop(taskId, newParentId, newPosition, oldParentId, {
      existingTasks: tasks,
      onTasksRefreshed: integrationCallbacks.onTasksRefreshed,
      onDateRecalculationNeeded: integrationCallbacks.onDateRecalculationNeeded
    });
  }, [dragDropHookResult.updateTaskAfterDragDrop, tasks, integrationCallbacks]);

  // Enhanced drag handlers with tasks integration
  const handleDragOver = useCallback((e, targetTask) => {
    return dragDropHookResult.handleDragOver(e, targetTask, tasks);
  }, [dragDropHookResult.handleDragOver, tasks]);

  const handleDrop = useCallback(async (e, targetTask) => {
    return await dragDropHookResult.handleDrop(e, targetTask, tasks, updateTaskAfterDragDrop);
  }, [dragDropHookResult.handleDrop, tasks, updateTaskAfterDragDrop]);

  const handleDropZoneDragOver = useCallback((e, parentId, position, prevTask, nextTask) => {
    return dragDropHookResult.handleDropZoneDragOver(e, parentId, position, prevTask, nextTask, tasks);
  }, [dragDropHookResult.handleDropZoneDragOver, tasks]);

  const handleDropZoneDrop = useCallback(async (e, parentId, position) => {
    return await dragDropHookResult.handleDropZoneDrop(e, parentId, position, tasks, updateTaskAfterDragDrop);
  }, [dragDropHookResult.handleDropZoneDrop, tasks, updateTaskAfterDragDrop]);

  const getDragFeedback = useCallback((task) => {
    return dragDropHookResult.getDragFeedback(task, tasks);
  }, [dragDropHookResult.getDragFeedback, tasks]);

  // Initial fetch
  useEffect(() => {
    if (!userLoading && !orgLoading && !initialFetchDoneRef.current && user?.id) {
      fetchTasks();
    }
  }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks]);

  // Create the context value - pass through hook results directly
  const contextValue = useMemo(() => ({
    // Core task data
    tasks,
    instanceTasks,
    templateTasks,
    loading,
    error,
    isFetching,
    fetchTasks,

    // Task operations (integrated with state management)
    createTask,
    updateTask,
    deleteTask,
    updateTaskDates,
    updateTaskAfterDragDrop,
    createProjectFromTemplate,

    // Direct access to all hook state and functions
    ...creationHookResult,
    ...templateHookResult,
    ...deletionHookResult,
    ...updateHookResult,
    ...dragDropHookResult,
    ...dateHookResult,
    ...licenseHookResult,

    // Enhanced drag handlers
    handleDragOver,
    handleDrop,
    handleDropZoneDragOver,
    handleDropZoneDrop,
    getDragFeedback,

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
    updateTaskAfterDragDrop,
    createProjectFromTemplate,

    // All hook results
    creationHookResult,
    templateHookResult,
    deletionHookResult,
    updateHookResult,
    dragDropHookResult,
    dateHookResult,
    licenseHookResult,

    // Enhanced handlers
    handleDragOver,
    handleDrop,
    handleDropZoneDragOver,
    handleDropZoneDrop,
    getDragFeedback
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext;