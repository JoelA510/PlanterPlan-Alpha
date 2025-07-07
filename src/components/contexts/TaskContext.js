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
import { fetchAllTasks, updateTaskCompletion, updateTaskPosition } from '../../services/taskService';

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

  // ✅ NEW: Optimistic update helpers for drag & drop
  const optimisticUpdateHelpers = useMemo(() => ({
    
    // Update task positions immediately (optimistic)
    updateTaskPositionsOptimistic: (taskUpdates) => {
      setTasks(prevTasks => 
        prevTasks.map(task => {
          const update = taskUpdates.find(u => u.id === task.id);
          return update ? { ...task, ...update } : task;
        })
      );
    },

    // Reorder tasks immediately (optimistic)
    reorderTasksOptimistic: (draggedId, newParentId, newPosition) => {
      setTasks(prevTasks => {
        const newTasks = prevTasks.map(task => 
          task.id === draggedId 
            ? { ...task, parent_task_id: newParentId, position: newPosition }
            : task
        );
        return newTasks;
      });
    },

    // Recalculate dates immediately (synchronous)
    recalculateDatesOptimistic: (taskList) => {
      const rootTasks = taskList.filter(t => !t.parent_task_id).sort((a, b) => a.position - b.position);
      let currentDate = new Date('2025-01-01');
      
      return taskList.map(task => {
        if (!task.parent_task_id) {
          // Root task: calculate based on children
          const children = taskList.filter(t => t.parent_task_id === task.id).sort((a, b) => a.position - b.position);
          const start = new Date(currentDate);
          let totalDuration = 0;
          
          children.forEach(child => {
            const childDuration = child.duration_days || 1;
            totalDuration += childDuration;
          });
          
          const end = new Date(start);
          end.setDate(end.getDate() + totalDuration);
          currentDate = new Date(end);
          
          return {
            ...task,
            start_date: start.toISOString().split('T')[0],
            due_date: end.toISOString().split('T')[0],
            duration_days: totalDuration || task.duration_days || 1
          };
        } else {
          // Child task: calculate from parent and siblings
          const parent = taskList.find(t => t.id === task.parent_task_id);
          if (!parent) return task;
          
          const siblings = taskList.filter(t => t.parent_task_id === task.parent_task_id).sort((a, b) => a.position - b.position);
          const taskIndex = siblings.findIndex(t => t.id === task.id);
          
          let taskStart = new Date(parent.start_date);
          for (let i = 0; i < taskIndex; i++) {
            const siblingDuration = siblings[i].duration_days || 1;
            taskStart.setDate(taskStart.getDate() + siblingDuration);
          }
          
          const taskDuration = task.duration_days || 1;
          const taskEnd = new Date(taskStart);
          taskEnd.setDate(taskEnd.getDate() + taskDuration);
          
          return {
            ...task,
            start_date: taskStart.toISOString().split('T')[0],
            due_date: taskEnd.toISOString().split('T')[0]
          };
        }
      });
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
          // Could show a toast notification here
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

    // Complete optimistic drag & drop update
    handleOptimisticDragDrop: (draggedId, newParentId, newPosition, oldParentId) => {
      setTasks(prevTasks => {
        // 1. Update positions
        const updatedTasks = prevTasks.map(task => 
          task.id === draggedId 
            ? { ...task, parent_task_id: newParentId, position: newPosition }
            : task
        );
        
        // 2. Recalculate dates immediately
        const tasksWithDates = optimisticUpdateHelpers.recalculateDatesOptimistic(updatedTasks);
        
        // 3. Background sync (don't wait)
        setTimeout(() => {
          optimisticUpdateHelpers.syncTaskPositionToDatabase(draggedId, newParentId, newPosition);
        }, 100);
        
        return tasksWithDates;
      });
    }

  }), []);

  // Integration callbacks for hooks (✅ SIMPLIFIED - removed complex drag/drop coordination)
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
      // ✅ SIMPLIFIED: Use simple date update instead of complex async chain
      if (dateHookResult.updateTaskDates) {
        dateHookResult.updateTaskDates(affectedTaskIds);
      }
    },

    // For template conversion
    onProjectCreated: async (rootProject, createdTasks) => {
      setTasks(prev => [...prev, ...createdTasks]);
      // ✅ SIMPLIFIED: Direct refresh instead of complex timing
      setTimeout(() => fetchTasks(true), 500);
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
  }), [tasks, fetchTasks, dateHookResult]);

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

  // Initial fetch
  useEffect(() => {
    if (!userLoading && !orgLoading && !initialFetchDoneRef.current && user?.id) {
      fetchTasks();
    }
  }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks]);

  // ✅ ENHANCED: Create the context value with optimistic update helpers
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