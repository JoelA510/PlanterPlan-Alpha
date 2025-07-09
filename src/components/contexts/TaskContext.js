// src/components/contexts/TaskContext.js - Enhanced version
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
import { fetchAllTasks, updateTaskCompletion, updateTaskPosition, fetchTasksForProjects } from '../../services/taskService';
import { getUserProjects } from '../../services/teamManagementService';
import { DateCacheEngine } from '../../utils/DateCacheEngine';

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

  // ✅ NEW: Member projects state
  const [memberProjects, setMemberProjects] = useState([]);
  const [memberProjectTasks, setMemberProjectTasks] = useState([]);
  const [memberProjectsLoading, setMemberProjectsLoading] = useState(false);
  const [memberProjectsError, setMemberProjectsError] = useState(null);

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

  // ✅ NEW: Fetch member projects and their tasks
  const fetchMemberProjects = useCallback(async () => {
    if (!user?.id) {
      setMemberProjects([]);
      setMemberProjectTasks([]);
      return;
    }

    try {
      setMemberProjectsLoading(true);
      setMemberProjectsError(null);

      console.log('Fetching member projects for user:', user.id);
      
      // Get projects the user is a member of
      const { data: memberProjectsData, error: memberError } = await getUserProjects(user.id);
      
      if (memberError) {
        throw new Error(memberError);
      }

      console.log('Found member projects:', memberProjectsData);
      setMemberProjects(memberProjectsData || []);

      // Fetch tasks for each member project
      if (memberProjectsData && memberProjectsData.length > 0) {
        const projectIds = memberProjectsData.map(mp => mp.project.id);
        console.log('Fetching tasks for project IDs:', projectIds);

        // Use the batch fetch method instead of individual fetches
        const { data: allMemberTasks, error: tasksError } = await fetchTasksForProjects(projectIds, organizationId);
        
        if (tasksError) {
          throw new Error(tasksError);
        }

        console.log('Member project tasks fetched:', allMemberTasks?.length || 0);
        setMemberProjectTasks(allMemberTasks || []);
      } else {
        setMemberProjectTasks([]);
      }

    } catch (err) {
      console.error('Error fetching member projects:', err);
      setMemberProjectsError(`Failed to load member projects: ${err.message}`);
      setMemberProjects([]);
      setMemberProjectTasks([]);
    } finally {
      setMemberProjectsLoading(false);
    }
  }, [user?.id, organizationId]);

  // Fetch all tasks (owned projects)
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

  // ✅ NEW: Combined fetch function for both owned and member projects
  const fetchAllProjectsAndTasks = useCallback(async (forceRefresh = false) => {
    console.log('Fetching all projects and tasks...');
    
    const [ownedResult] = await Promise.all([
      fetchTasks(forceRefresh),
      fetchMemberProjects()
    ]);
    
    return ownedResult;
  }, [fetchTasks, fetchMemberProjects]);

  // Initialize date management system
  const dateHookResult = useTaskDates(tasks, getProjectStartDate());

  // Initialize all operation hooks with integration callbacks
  const creationHookResult = useTaskCreation();
  const templateHookResult = useTemplateToProject();
  const deletionHookResult = useTaskDeletion();
  const updateHookResult = useTaskUpdate();
  const licenseHookResult = useLicenses();

  // ✅ ENHANCED: Optimistic update helpers for drag & drop
  const optimisticUpdateHelpers = useMemo(() => ({
    
    // Update task positions immediately (optimistic)
    updateTaskPositionsOptimistic: (taskUpdates) => {
      setTasks(prevTasks => 
        prevTasks.map(task => {
          const update = taskUpdates.find(u => u.id === task.id);
          return update ? { ...task, ...update } : task;
        })
      );

      // ✅ NEW: Also update member project tasks if needed
      setMemberProjectTasks(prevTasks => 
        prevTasks.map(task => {
          const update = taskUpdates.find(u => u.id === task.id);
          return update ? { ...task, ...update } : task;
        })
      );
    },

    // Reorder tasks immediately (optimistic)
    reorderTasksOptimistic: (draggedId, newParentId, newPosition) => {
      const updateTask = (task) => 
        task.id === draggedId 
          ? { ...task, parent_task_id: newParentId, position: newPosition }
          : task;

      setTasks(prevTasks => prevTasks.map(updateTask));
      setMemberProjectTasks(prevTasks => prevTasks.map(updateTask));
    },

    recalculateDatesOptimistic: (taskList) => {
      // Use the actual project start date
      const rootTasks = taskList.filter(t => !t.parent_task_id);
      const projectStartDate = rootTasks[0]?.start_date || new Date().toISOString();
      
      // Use your existing DateCacheEngine
      const engine = new DateCacheEngine();
      const dates = engine.calculateAllDates(taskList, projectStartDate);
      
      // Apply calculated dates to tasks
      return taskList.map(task => ({
        ...task,
        start_date: dates.get(task.id)?.start_date || task.start_date,
        due_date: dates.get(task.id)?.due_date || task.due_date,
        duration_days: dates.get(task.id)?.duration_days || task.duration_days
      }));
    },

    // Background database sync (non-blocking)
    syncTaskPositionToDatabase: async (taskId, parentId, position) => {
      try {
        console.log('🔄 Background sync:', { taskId, parentId, position });
        const result = await updateTaskPosition(taskId, parentId, position);
        
        if (result.success) {
          console.log('✅ Background sync successful');
        } else {
          console.warn('⚠️ Background sync failed:', result.error);
        }
        
        return result;
      } catch (error) {
        console.error('❌ Background sync error:', error);
        return { success: false, error: error.message };
      }
    },

    // Batch sync multiple position changes
    batchSyncPositions: async (updates) => {
      try {
        console.log('🔄 Batch syncing positions:', updates.length, 'updates');
        
        const promises = updates.map(({ taskId, parentId, position }) => 
          updateTaskPosition(taskId, parentId, position)
        );
        
        const results = await Promise.all(promises);
        const failures = results.filter(r => !r.success);
        
        if (failures.length === 0) {
          console.log('✅ Batch sync successful');
          return { success: true };
        } else {
          console.warn('⚠️ Some syncs failed:', failures.length, 'failures');
          return { success: false, failures };
        }
      } catch (error) {
        console.error('❌ Batch sync error:', error);
        return { success: false, error: error.message };
      }
    },

    // ✅ ENHANCED: Handle both owned and member project tasks
    handleOptimisticDragDrop: (draggedId, newParentId, newPosition, oldParentId) => {
      const updateTasks = (prevTasks) => {
        // 1. Update positions
        const updatedTasks = prevTasks.map(task => 
          task.id === draggedId 
            ? { ...task, parent_task_id: newParentId, position: newPosition }
            : task
        );
        
        // 2. Recalculate dates immediately
        const tasksWithDates = optimisticUpdateHelpers.recalculateDatesOptimistic(updatedTasks);
        
        return tasksWithDates;
      };

      setTasks(updateTasks);
      setMemberProjectTasks(updateTasks);
      
      // 3. Background sync (don't wait)
      setTimeout(() => {
        optimisticUpdateHelpers.syncTaskPositionToDatabase(draggedId, newParentId, newPosition);
      }, 100);
    }

  }), []);

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
      if (dateHookResult.updateTaskDates) {
        dateHookResult.updateTaskDates(affectedTaskIds);
      }
    },

    // For template conversion
    onProjectCreated: async (rootProject, createdTasks) => {
      setTasks(prev => [...prev, ...createdTasks]);
      setTimeout(() => fetchAllProjectsAndTasks(true), 500);
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
      await fetchAllProjectsAndTasks(true);
    }
  }), [tasks, fetchAllProjectsAndTasks, dateHookResult]);

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

  // ✅ NEW: Simplified drag & drop integration function
  const updateTaskAfterDragDrop = useCallback(async (taskId, newParentId, newPosition, oldParentId) => {
    console.log('🎯 TaskContext: Processing drag & drop update');
    
    // Use optimistic update helper
    optimisticUpdateHelpers.handleOptimisticDragDrop(taskId, newParentId, newPosition, oldParentId);
    
    return { success: true };
  }, [optimisticUpdateHelpers]);

  // ✅ NEW: Helper functions for member projects
  const getUserRole = useCallback((projectId) => {
    const membership = memberProjects.find(mp => mp.project.id === projectId);
    return membership?.role || null;
  }, [memberProjects]);

  const canUserEdit = useCallback((projectId) => {
    const role = getUserRole(projectId);
    return ['owner', 'full_user'].includes(role);
  }, [getUserRole]);

  const canUserManageTeam = useCallback((projectId) => {
    const role = getUserRole(projectId);
    return role === 'owner';
  }, [getUserRole]);

  // Initial fetch
  useEffect(() => {
    if (!userLoading && !orgLoading && !initialFetchDoneRef.current && user?.id) {
      fetchAllProjectsAndTasks();
    }
  }, [user?.id, organizationId, userLoading, orgLoading, fetchAllProjectsAndTasks]);

  // ✅ ENHANCED: Create the context value with member project data
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

    // ✅ NEW: Member projects data
    memberProjects,
    memberProjectTasks,
    memberProjectsLoading,
    memberProjectsError,
    fetchMemberProjects,
    fetchAllProjectsAndTasks,

    // ✅ NEW: User permission helpers
    getUserRole,
    canUserEdit,
    canUserManageTeam,

    // Task operations (integrated with state management)
    createTask,
    updateTask,
    deleteTask,
    updateTaskDates,
    createProjectFromTemplate,

    // ✅ NEW: Optimistic update functions for drag & drop
    updateTaskAfterDragDrop,
    updateTasksOptimistic: optimisticUpdateHelpers.updateTaskPositionsOptimistic,
    reorderTasksOptimistic: optimisticUpdateHelpers.reorderTasksOptimistic,
    recalculateDatesOptimistic: optimisticUpdateHelpers.recalculateDatesOptimistic,
    syncTaskPositionToDatabase: optimisticUpdateHelpers.syncTaskPositionToDatabase,
    batchSyncPositions: optimisticUpdateHelpers.batchSyncPositions,
    handleOptimisticDragDrop: optimisticUpdateHelpers.handleOptimisticDragDrop,

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

    // ✅ NEW: Member projects state
    memberProjects,
    memberProjectTasks,
    memberProjectsLoading,
    memberProjectsError,
    fetchMemberProjects,
    fetchAllProjectsAndTasks,

    // ✅ NEW: Permission helpers
    getUserRole,
    canUserEdit,
    canUserManageTeam,

    // Integrated operations
    createTask,
    updateTask,
    deleteTask,
    updateTaskDates,
    createProjectFromTemplate,
    updateTaskAfterDragDrop,

    // Optimistic helpers
    optimisticUpdateHelpers,

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