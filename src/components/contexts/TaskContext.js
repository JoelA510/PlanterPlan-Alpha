import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationProvider';
import { useLicenses } from '../../hooks/useLicenses';
import { useTaskCreation } from '../../hooks/useTaskCreation';
import { useTemplateToProject } from '../../hooks/useTemplateToProject';
import { useTaskDeletion } from '../../hooks/useTaskDeletion';
import { useLocation } from 'react-router-dom';
import { useTaskDates } from '../../hooks/useTaskDates';

// Import functions from taskService
import { 
  fetchAllTasks, 
  updateTaskPosition, 
  updateSiblingPositions, 
  updateTaskCompletion,
  updateTaskDateFields,
  updateTaskComplete, 
} from '../../services/taskService';

// Import the date utility functions (for fallback calculations)
import { 
  calculateDueDate,
} from '../../utils/dateUtils';

// Import sequential task manager functions (for templates only)
import { 
  calculateParentDuration, 
  updateAncestorDurations,
  updateAfterReordering,
  getTasksRequiringUpdates,
  updateTasksInDatabase
} from '../../utils/sequentialTaskManager';

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

  // Use the license hook
  const licenseHookResult = useLicenses();
  const {
    canCreateProject,
    userHasProjects,
    projectLimitReason,
    userLicenses,
    selectedLicenseId,
    isCheckingLicense,
    validateProjectCreation,
    // Get individual license actions
    applyLicenseKey,
    selectLicense,
    getSelectedLicense,
    clearSelectedLicense,
    checkProjectCreationAbility,
    fetchUserLicenses
  } = licenseHookResult;

  // Use the task creation hook
  const {
    createTask: createTaskFromHook,
    isCreating: isCreatingTask,
    creationError,
    clearCreationError
  } = useTaskCreation();

  // Use the template-to-project conversion hook
  const {
    createProjectFromTemplate: createProjectFromTemplateFromHook,
    isConverting: isConvertingTemplate,
    conversionError,
    conversionProgress,
    clearConversionError,
    resetProgress
  } = useTemplateToProject();

  // Use the task deletion hook
  const {
    deleteTask: deleteTaskFromHook,
    isDeleting: isDeletingTask,
    deletionError,
    deletionProgress,
    getDeletionConfirmationMessage,
    clearDeletionError,
    resetProgress: resetDeletionProgress
  } = useTaskDeletion();
  
  // State for tasks - ONLY the main tasks array
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const isMountedRef = useRef(true);
  const initialFetchDoneRef = useRef(false);

  // Helper function to get project start date
  const getProjectStartDate = useCallback(() => {
    // Try to find a root task with start_date, or use today
    const rootTasks = tasks.filter(t => !t.parent_task_id);
    const projectWithStartDate = rootTasks.find(t => t.start_date);
    
    if (projectWithStartDate) {
      return projectWithStartDate.start_date;
    }
    
    // Fallback to today
    return new Date().toISOString().split('T')[0];
  }, [tasks]);

  // Initialize the date management system
  const {
    taskDates,
    isCalculating: datesCalculating,
    recalculateAllDates,
    updateTaskDates: updateTaskDatesIncremental,
    getTaskDates,
    getTaskStartDate,
    getTaskDueDate,
    getTaskDuration,
    isTaskOverdue,
    isTaskDueToday,
    getCacheStats,
    clearCache
  } = useTaskDates(tasks, getProjectStartDate());
  
  // Derived task arrays using useMemo for performance
  const instanceTasks = useMemo(() => 
    tasks.filter(task => task.origin === "instance"), 
    [tasks]
  );
  
  const templateTasks = useMemo(() => 
    tasks.filter(task => task.origin === "template"), 
    [tasks]
  );

  // Update tasks state safely
  const updateTasks = useCallback((newTasks, isOptimistic = false) => {
    if (!Array.isArray(newTasks)) {
      console.error('updateTasks received non-array value:', newTasks);
      return;
    }
    
    try {
      if (isOptimistic) {
        console.log('🔄 Updating tasks optimistically...');
      }
      
      setTasks(newTasks);
      
      if (isOptimistic) {
        console.log('✅ Tasks updated optimistically');
      }
    } catch (err) {
      console.error('Error in updateTasks:', err);
    }
  }, []);
  
  // Fetch all tasks (both instances and templates)
  const fetchTasks = useCallback(async (forceRefresh = false) => {
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
      
      // Combine all tasks and update state
      const allTasks = [...instanceData, ...templateData];
      setTasks(allTasks);
      setError(null);
      
      // Mark initial fetch as complete
      initialFetchDoneRef.current = true;
      
      // Return filtered arrays for backward compatibility
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

  // Helper functions for finding related tasks
  const getTaskDescendants = useCallback((taskId, taskList = tasks) => {
    const descendants = [];
    const findChildren = (parentId) => {
      const children = taskList.filter(t => t.parent_task_id === parentId);
      children.forEach(child => {
        descendants.push(child.id);
        findChildren(child.id);
      });
    };
    findChildren(taskId);
    return descendants;
  }, [tasks]);

  const getTaskSiblings = useCallback((taskId, taskList = tasks) => {
    const task = taskList.find(t => t.id === taskId);
    if (!task) return [];
    
    return taskList
      .filter(t => t.parent_task_id === task.parent_task_id && t.id !== taskId)
      .map(t => t.id);
  }, [tasks]);

  // Wrapper for task creation that integrates with our state management
  const createNewTask = useCallback(async (taskData, licenseId = null) => {
    const result = await createTaskFromHook(taskData, {
      licenseId,
      existingTasks: tasks,
      onTaskCreated: async (newTask) => {
        // Update the tasks list
        setTasks(prev => [...prev, newTask]);
        
        // Trigger incremental date recalculation for affected tasks
        const affectedTaskIds = [newTask.id];
        if (newTask.parent_task_id) {
          // Also update siblings that come after this task
          const siblings = tasks
            .filter(t => t.parent_task_id === newTask.parent_task_id)
            .filter(t => (t.position || 0) >= (newTask.position || 0));
          affectedTaskIds.push(...siblings.map(t => t.id));
        }
        
        // Let the date system handle recalculation
        await updateTaskDatesIncremental(affectedTaskIds);
      }
    });

    return result;
  }, [createTaskFromHook, tasks, updateTaskDatesIncremental]);

  // Wrapper for template-to-project conversion that integrates with our state management
  const createProjectFromTemplate = useCallback(async (templateId, projectData, licenseId = null) => {
    const result = await createProjectFromTemplateFromHook(templateId, projectData, {
      licenseId,
      templateTasks,
      onProjectCreated: async (rootProject, createdTasks) => {
        // Update the tasks list with all created tasks
        setTasks(prev => [...prev, ...createdTasks]);
        
        // Trigger a full refresh to get the latest state with proper calculations
        setTimeout(() => {
          fetchTasks(true);
        }, 1000);
      }
    });

    return result;
  }, [createProjectFromTemplateFromHook, templateTasks, fetchTasks]);

  // Wrapper for task deletion that integrates with our state management
  const deleteTaskHandler = useCallback(async (taskId, deleteChildren = true) => {
    const result = await deleteTaskFromHook(taskId, {
      deleteChildren,
      existingTasks: tasks,
      onTasksDeleted: async (deletedIds, hasChildren) => {
        console.log(`Tasks deleted successfully: ${deletedIds.length} tasks`);
        
        // Get siblings that will be affected by the deletion
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (taskToDelete) {
          const siblings = getTaskSiblings(taskId, tasks);
          
          // Trigger date recalculation for affected siblings if this is an instance task
          if (taskToDelete.origin === 'instance' && siblings.length > 0) {
            setTimeout(async () => {
              await updateTaskDatesIncremental(siblings);
            }, 100);
          }
        }
      },
      onTasksUpdated: async (updatedTasks) => {
        // Update our local state with the new task list
        setTasks(updatedTasks);
      }
    });

    return result;
  }, [deleteTaskFromHook, tasks, getTaskSiblings, updateTaskDatesIncremental]);

  // Update task handler with date system integration
  const updateTaskHandler = async (taskId, updatedTaskData) => {
    try {
      const originalTask = tasks.find(t => t.id === taskId);
      if (!originalTask) {
        throw new Error('Task not found');
      }
      
      // Check if default_duration was changed (for templates)
      const defaultDurationChanged = 
        updatedTaskData.default_duration !== undefined && 
        updatedTaskData.default_duration !== originalTask.default_duration;
      
      // Handle template duration changes with ancestor impacts
      if (originalTask.origin === 'template' && defaultDurationChanged && 
          updatedTaskData.affectedAncestors && updatedTaskData.affectedAncestors.length > 0) {
        
        console.log('Handling ancestor impacts:', updatedTaskData.affectedAncestors);
        
        const ancestorUpdates = updatedTaskData.affectedAncestors.map(ancestor => ({
          id: ancestor.id,
          duration_days: ancestor.newDuration
        }));
        
        const taskUpdateData = { ...updatedTaskData };
        delete taskUpdateData.affectedAncestors;
        
        const result = await updateTaskComplete(taskId, taskUpdateData);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update task');
        }
        
        for (const update of ancestorUpdates) {
          await updateTaskComplete(update.id, { duration_days: update.duration_days });
        }
        
        await fetchTasks(true);
        return { success: true, data: result.data };
      }
      
      // Standard update flow
      const result = await updateTaskComplete(taskId, updatedTaskData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task');
      }
      
      // Update tasks state
      let updatedTaskList = tasks.map(task => 
        task.id === taskId ? { ...task, ...result.data } : task
      );
      
      // Handle template task updates
      if (originalTask.origin === 'template') {
        const hasChildren = updatedTaskList.some(t => t.parent_task_id === taskId);
        
        if (hasChildren) {
          updatedTaskList = updateAncestorDurations(taskId, updatedTaskList);
          const tasksToUpdate = getTasksRequiringUpdates(tasks, updatedTaskList);
          await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
        }
        
        if (originalTask.parent_task_id && defaultDurationChanged) {
          updatedTaskList = updateAncestorDurations(originalTask.id, updatedTaskList);
          const tasksToUpdate = getTasksRequiringUpdates(tasks, updatedTaskList);
          await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
        }
      }
      
      setTasks(updatedTaskList);
      
      // Determine which tasks need date recalculation
      const affectedTaskIds = [taskId];
      
      // If duration changed, affect descendants and siblings
      if (updatedTaskData.duration_days !== undefined) {
        const descendants = getTaskDescendants(taskId, updatedTaskList);
        const siblings = getTaskSiblings(taskId, updatedTaskList);
        affectedTaskIds.push(...descendants, ...siblings);
      }
      
      // If hierarchy changed, affect old and new parent branches
      if (updatedTaskData.parent_task_id !== undefined) {
        const oldParentChildren = getTaskSiblings(taskId, tasks);
        const newParentChildren = getTaskSiblings(taskId, updatedTaskList);
        affectedTaskIds.push(...oldParentChildren, ...newParentChildren);
      }
      
      // Trigger incremental date recalculation
      await updateTaskDatesIncremental([...new Set(affectedTaskIds)]);
      
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Error updating task:', err);
      return { success: false, error: err.message };
    }
  };

  // Update task dates with new system
  const updateTaskDates = useCallback(async (taskId, dateData) => {
    try {
      console.log('Updating task dates:', taskId, dateData);
      
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) {
        throw new Error('Task not found');
      }
      
      let enhancedDateData = { ...dateData };
      
      // Calculate due date if needed
      if (dateData.start_date && dateData.duration_days && !dateData.due_date) {
        const calculatedDueDate = calculateDueDate(
          dateData.start_date,
          dateData.duration_days
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
      const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
      setTasks(updatedTasks);
      
      // Get affected task IDs for date recalculation
      const affectedTaskIds = [taskId];
      const descendants = getTaskDescendants(taskId, updatedTasks);
      const siblings = getTaskSiblings(taskId, updatedTasks);
      affectedTaskIds.push(...descendants, ...siblings);
      
      // Trigger incremental date recalculation
      await updateTaskDatesIncremental([...new Set(affectedTaskIds)]);
      
      return { success: true, data: updatedTask };
    } catch (err) {
      console.error('Error updating task dates:', err);
      return { success: false, error: err.message };
    }
  }, [tasks, getTaskDescendants, getTaskSiblings, updateTaskDatesIncremental]);

  // Update task after drag & drop with new date system
  const updateTaskAfterDragDrop = async (taskId, newParentId, newPosition, oldParentId) => {
    try {
      console.log(`Updating task after drag/drop: task=${taskId}, newParent=${newParentId}, newPos=${newPosition}`);

      // Update position in database
      const result = await updateTaskPosition(taskId, newParentId, newPosition);

      if (result.error) {
        throw new Error(result.error || 'Failed to update task position');
      }

      // Force refresh tasks to get updated positions
      await fetchTasks(true);

      // Get affected task IDs for date recalculation
      const affectedTaskIds = [taskId];
      
      // Add old siblings (if parent changed)
      if (oldParentId && oldParentId !== newParentId) {
        const oldSiblings = tasks.filter(t => t.parent_task_id === oldParentId);
        affectedTaskIds.push(...oldSiblings.map(t => t.id));
      }
      
      // Add new siblings
      if (newParentId) {
        const newSiblings = tasks.filter(t => t.parent_task_id === newParentId);
        affectedTaskIds.push(...newSiblings.map(t => t.id));
      }

      // Trigger incremental date recalculation
      await updateTaskDatesIncremental([...new Set(affectedTaskIds)]);

      return { success: true };
    } catch (err) {
      console.error('Error updating tasks after drag/drop:', err);
      return { success: false, error: err.message };
    }
  };

  // Get all tasks in a hierarchy (utility function)
  const getAllTasksInHierarchy = (rootId, allTasks) => {
    if (!rootId || !Array.isArray(allTasks) || allTasks.length === 0) {
      return [];
    }
    
    const result = [];
    
    const collectTasks = (parentId) => {
      const parent = allTasks.find(t => t.id === parentId);
      if (parent) result.push(parent);
      
      const children = allTasks.filter(t => t.parent_task_id === parentId);
      result.push(...children);
      
      children.forEach(child => collectTasks(child.id));
    };
    
    collectTasks(rootId);
    return result;
  };
  
  // Initial fetch when component mounts
  useEffect(() => {
    if (userLoading || orgLoading) {
      return;
    }
    
    if (!initialFetchDoneRef.current && user?.id) {
      fetchTasks();
    }
  }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks]);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create the context value
  const contextValue = useMemo(() => ({
    // Task management
    tasks,
    instanceTasks,
    templateTasks,
    loading,
    initialLoading,
    error,
    isFetching,

    // Date-related functions and state
    taskDates,
    datesCalculating,
    getTaskDates,
    getTaskStartDate,
    getTaskDueDate,
    getTaskDuration,
    isTaskOverdue,
    isTaskDueToday,
    recalculateAllDates,
    updateTaskDates: updateTaskDatesIncremental,

    // Core task operations
    fetchTasks,
    createTask: createNewTask, // Uses extracted hook internally
    updateTask: updateTaskHandler,
    deleteTask: deleteTaskHandler, // Now uses extracted hook internally
    updateTaskAfterDragDrop,
    createProjectFromTemplate, // Uses extracted hook internally

    // Task creation specific state (from the extracted hook)
    isCreatingTask,
    creationError,
    clearCreationError,

    // Template conversion specific state (from the extracted hook)
    isConvertingTemplate,
    conversionError,
    conversionProgress,
    clearConversionError,
    resetProgress,

    // Task deletion specific state (from the extracted hook)
    isDeletingTask,
    deletionError,
    deletionProgress,
    getDeletionConfirmationMessage,
    clearDeletionError,
    resetDeletionProgress,

    // Direct task service functions
    updateTaskPosition,
    updateSiblingPositions,
    updateTaskCompletion,
    updateTaskDates,

    // License system
    canCreateProject,
    projectLimitReason,
    userLicenses,
    selectedLicenseId,
    userHasProjects,
    isCheckingLicense,
    validateProjectCreation,
    applyLicenseKey,
    selectLicense,
    getSelectedLicense,
    clearSelectedLicense,
    checkProjectCreationAbility,
    fetchUserLicenses,

    // Utility functions
    updateTasks,
    determineTaskStartDate: (task) => getTaskStartDate(task.id),
    getAllTasksInHierarchy,
    
    // Debug functions
    getCacheStats,
    clearCache
  }), [
    // Task state
    tasks,
    instanceTasks,
    templateTasks,
    loading,
    initialLoading,
    error,
    isFetching,
    
    // Task creation state
    isCreatingTask,
    creationError,
    clearCreationError,

    // Template conversion state
    isConvertingTemplate,
    conversionError,
    conversionProgress,
    clearConversionError,
    resetProgress,

    // Task deletion state
    isDeletingTask,
    deletionError,
    deletionProgress,
    getDeletionConfirmationMessage,
    clearDeletionError,
    resetDeletionProgress,
    
    // Date state
    taskDates,
    datesCalculating,
    getTaskDates,
    getTaskStartDate,
    getTaskDueDate,
    getTaskDuration,
    isTaskOverdue,
    isTaskDueToday,
    recalculateAllDates,
    updateTaskDatesIncremental,
    
    // Functions
    fetchTasks,
    createNewTask,
    updateTaskHandler,
    deleteTaskHandler,
    updateTaskAfterDragDrop,
    createProjectFromTemplate,
    updateTaskDates,
    updateTasks,
    
    // License state
    canCreateProject,
    projectLimitReason,
    userLicenses,
    selectedLicenseId,
    userHasProjects,
    isCheckingLicense,
    validateProjectCreation,
    applyLicenseKey,
    selectLicense,
    getSelectedLicense,
    clearSelectedLicense,
    checkProjectCreationAbility,
    fetchUserLicenses,
    
    // Debug
    getCacheStats,
    clearCache
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext;