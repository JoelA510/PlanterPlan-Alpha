import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationProvider';
import { useLicenses } from '../../hooks/useLicenses';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { getNextAvailablePosition } from '../../utils/sparsePositioning';
import { useTaskDates } from '../../hooks/useTaskDates';

// Import functions from taskService
import { 
  fetchAllTasks, 
  createTask, 
  updateTaskPosition, 
  updateSiblingPositions, 
  updateTaskCompletion,
  deleteTask,
  updateTaskDateFields,
  updateTaskComplete, 
} from '../../services/taskService';

// Import the date utility functions (for fallback calculations)
import { 
  calculateDueDate,
  calculateStartDate,
  determineTaskStartDate,
} from '../../utils/dateUtils';

// Import sequential task manager functions (for templates only)
import { 
  calculateParentDuration, 
  calculateSequentialStartDates,
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

  // Create new task with date system integration
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
        const validation = validateProjectCreation(licenseId);
        if (!validation.canCreate) {
          throw new Error(validation.reason);
        }
        licenseId = validation.licenseId;
      }
      
      // Handle sparse positioning if not already set
      let enhancedTaskData = {
        ...taskData,
        creator: user.id,
        origin: taskData.origin || "instance",
        white_label_id: organizationId,
        license_id: licenseId
      };
      
      // Calculate sparse position if not explicitly provided
      if (enhancedTaskData.position === undefined) {
        enhancedTaskData.position = getNextAvailablePosition(tasks, taskData.parent_task_id);
        console.log('Calculated sparse position:', enhancedTaskData.position, 'for parent:', taskData.parent_task_id);
      }
      
      // For initial date setting, use fallback calculations
      // The date cache system will recalculate these properly after creation
      if (taskData.parent_task_id) {
        const calculatedStartDate = determineTaskStartDate({
          ...enhancedTaskData,
        }, tasks);
        
        if (calculatedStartDate) {
          enhancedTaskData.start_date = calculatedStartDate.toISOString();
          
          if (taskData.duration_days) {
            const calculatedDueDate = calculateDueDate(
              calculatedStartDate,
              taskData.duration_days
            );
            
            if (calculatedDueDate) {
              enhancedTaskData.due_date = calculatedDueDate.toISOString();
            }
          }
        } else if (taskData.days_from_start_until_due !== undefined) {
          const parentTask = tasks.find(t => t.id === taskData.parent_task_id);
          
          if (parentTask && parentTask.start_date) {
            const fallbackDate = calculateStartDate(
              parentTask.start_date,
              taskData.days_from_start_until_due
            );
            
            if (fallbackDate) {
              enhancedTaskData.start_date = fallbackDate.toISOString();
              
              if (taskData.duration_days) {
                const calculatedDueDate = calculateDueDate(
                  fallbackDate,
                  taskData.duration_days
                );
                
                if (calculatedDueDate) {
                  enhancedTaskData.due_date = calculatedDueDate.toISOString();
                }
              }
            }
          }
        }
      } else if (isTopLevelProject && !enhancedTaskData.start_date) {
        const currentDate = new Date();
        enhancedTaskData.start_date = currentDate.toISOString();
        
        if (enhancedTaskData.duration_days) {
          const calculatedDueDate = calculateDueDate(
            currentDate,
            enhancedTaskData.duration_days
          );
          
          if (calculatedDueDate) {
            enhancedTaskData.due_date = calculatedDueDate.toISOString();
          }
        }
      }
      
      console.log('Enhanced task data with sparse positioning:', enhancedTaskData);
      
      // Create the task
      const result = await createTask(enhancedTaskData);
      
      if (result.error) {
        console.error('Error from createTask API:', result.error);
        throw new Error(result.error);
      }
      
      console.log('Task created successfully:', result.data);
      
      if (result.data) {
        // Update the tasks list
        setTasks(prev => [...prev, result.data]);
        
        // Trigger incremental date recalculation for affected tasks
        const affectedTaskIds = [result.data.id];
        if (result.data.parent_task_id) {
          // Also update siblings that come after this task
          const siblings = tasks
            .filter(t => t.parent_task_id === result.data.parent_task_id)
            .filter(t => (t.position || 0) >= (result.data.position || 0));
          affectedTaskIds.push(...siblings.map(t => t.id));
        }
        
        // Let the date system handle recalculation
        await updateTaskDatesIncremental(affectedTaskIds);
      }
      
      return { data: result.data, error: null };
    } catch (err) {
      console.error('Error creating task:', err);
      return { data: null, error: err.message };
    }
  }, [user?.id, organizationId, validateProjectCreation, tasks, updateTaskDatesIncremental]);

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

  // Delete task handler with date system integration
  const deleteTaskHandler = useCallback(async (taskId, deleteChildren = true) => {
    try {
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) {
        throw new Error('Task not found');
      }
      
      console.log(`Deleting task ${taskId} (with children: ${deleteChildren})`);
      
      // Get siblings that will be affected by the deletion
      const siblings = getTaskSiblings(taskId, tasks);
      const parentId = taskToDelete.parent_task_id;
      const isTemplate = taskToDelete.origin === 'template';
      
      const result = await deleteTask(taskId, deleteChildren);
      
      if (!result.success) {
        if (result.error && (
          result.error.includes("Invalid time value") || 
          result.error.includes("Invalid date")
        )) {
          console.warn("Date calculation issue during deletion, continuing with UI update");
          
          const childTaskIds = [];
          const findAllChildren = (parentId) => {
            const children = tasks.filter(t => t.parent_task_id === parentId).map(t => t.id);
            childTaskIds.push(...children);
            children.forEach(childId => findAllChildren(childId));
          };
          
          let allTaskIdsToDelete = [taskId];
          if (deleteChildren) {
            findAllChildren(taskId);
            allTaskIdsToDelete = [...allTaskIdsToDelete, ...childTaskIds];
          }
          
          const updatedTaskList = tasks.filter(task => !allTaskIdsToDelete.includes(task.id));
          
          if (isTemplate && parentId) {
            const reorderedTasks = updateAfterReordering(parentId, updatedTaskList);
            const parent = reorderedTasks.find(t => t.id === parentId);
            if (parent) {
              const newDuration = calculateParentDuration(parentId, reorderedTasks);
              if (parent.duration_days !== newDuration) {
                const tasksWithUpdatedDurations = updateAncestorDurations(parentId, reorderedTasks);
                const tasksToUpdate = getTasksRequiringUpdates(updatedTaskList, tasksWithUpdatedDurations);
                await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
                updateTasks(tasksWithUpdatedDurations);
                return { 
                  success: true, 
                  deletedIds: allTaskIdsToDelete,
                  hasChildren: childTaskIds.length > 0
                };
              }
            }
            updateTasks(reorderedTasks);
          } else {
            updateTasks(updatedTaskList);
          }
          
          return { 
            success: true, 
            deletedIds: allTaskIdsToDelete,
            hasChildren: childTaskIds.length > 0
          };
        }
        
        throw new Error(result.error);
      }
      
      // Remove all deleted tasks from local state
      if (result.deletedIds && Array.isArray(result.deletedIds)) {
        const updatedTaskList = tasks.filter(task => !result.deletedIds.includes(task.id));
        
        console.log(`Deleted ${result.deletedIds.length} tasks`);
        
        if (isTemplate && parentId) {
          const reorderedTasks = updateAfterReordering(parentId, updatedTaskList);
          const parent = reorderedTasks.find(t => t.id === parentId);
          if (parent) {
            const newDuration = calculateParentDuration(parentId, reorderedTasks);
            if (parent.duration_days !== newDuration) {
              const withUpdatedDurations = updateAncestorDurations(parentId, reorderedTasks);
              const tasksToUpdate = getTasksRequiringUpdates(updatedTaskList, withUpdatedDurations);
              await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
              updateTasks(withUpdatedDurations);
              return { 
                success: true, 
                deletedIds: result.deletedIds,
                hasChildren: result.deletedIds.length > 1
              };
            }
          }
          updateTasks(reorderedTasks);
        } else {
          updateTasks(updatedTaskList);
          
          // Trigger date recalculation for affected siblings
          if (siblings.length > 0) {
            await updateTaskDatesIncremental(siblings);
          }
        }
      }
      
      return { 
        success: true, 
        deletedIds: result.deletedIds,
        hasChildren: result.deletedIds && result.deletedIds.length > 1
      };
    } catch (err) {
      console.error('Error deleting task:', err);
      
      if (err.message && (
        err.message.includes("Invalid time value") || 
        err.message.includes("Invalid date")
      )) {
        return { 
          success: false, 
          error: "Date calculation error during deletion. Try refreshing the page." 
        };
      }
      
      return { success: false, error: err.message };
    }
  }, [tasks, getTaskSiblings, updateTaskDatesIncremental, updateTasks]);

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

  // Create project from template (simplified for date system)
  const createProjectFromTemplate = async (templateId, projectData, licenseId = null) => {
    try {
      console.log('Creating project from template:', templateId);
      
      if (!user?.id) {
        throw new Error('Cannot create project: User ID is missing');
      }
      
      if (!templateId) {
        throw new Error('Template ID is required');
      }
      
      const template = templateTasks.find(t => t.id === templateId);
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`);
      }
      
      const effectiveDuration = template.duration_days || template.default_duration || 1;
      const projectStartDate = projectData.startDate ? new Date(projectData.startDate) : new Date();
      
      const projectBaseData = {
        title: projectData.name || template.title,
        description: template.description,
        purpose: template.purpose,
        actions: template.actions || [],
        resources: template.resources || [],
        origin: 'instance',
        is_complete: false,
        creator: user.id,
        white_label_id: organizationId,
        license_id: licenseId,
        start_date: projectStartDate.toISOString(),
        parent_task_id: null,
        position: getNextAvailablePosition(instanceTasks, null),
        default_duration: template.default_duration || 1,
        duration_days: effectiveDuration
      };
      
      const calculatedDueDate = calculateDueDate(projectStartDate, effectiveDuration);
      if (calculatedDueDate) {
        projectBaseData.due_date = calculatedDueDate.toISOString();
      }
      
      // Create the top-level project
      const result = await createTask(projectBaseData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      const newProject = result.data;
      console.log('Created root project:', newProject);
      
      const createdTasksArray = [newProject];
      const templateToProjectMap = { [templateId]: newProject.id };
      
      // Get all template tasks in the hierarchy
      const templateTasksTree = await getAllTemplateTasksInHierarchy(templateId);
      console.log(`Found ${templateTasksTree.length} template tasks in hierarchy`);
      
      // Create all child tasks by level
      const templateTasksByLevel = {};
      templateTasksTree.forEach(task => {
        let level = 0;
        let currentTask = task;
        while (currentTask.parent_task_id) {
          level++;
          currentTask = templateTasksTree.find(t => t.id === currentTask.parent_task_id) || {};
        }
        
        if (!templateTasksByLevel[level]) {
          templateTasksByLevel[level] = [];
        }
        templateTasksByLevel[level].push(task);
      });
      
      const levels = Object.keys(templateTasksByLevel).sort((a, b) => parseInt(a) - parseInt(b));
      
      for (const level of levels) {
        if (level === '0') continue;
        
        const tasksAtLevel = templateTasksByLevel[level];
        console.log(`Processing ${tasksAtLevel.length} tasks at level ${level}`);
        
        for (const templateTask of tasksAtLevel) {
          const templateParentId = templateTask.parent_task_id;
          const projectParentId = templateToProjectMap[templateParentId];
          
          if (!projectParentId) {
            console.error(`Missing project parent ID for template: ${templateTask.title}`);
            continue;
          }
          
          const childTaskData = {
            title: templateTask.title,
            description: templateTask.description,
            purpose: templateTask.purpose,
            actions: templateTask.actions || [],
            resources: templateTask.resources || [],
            origin: 'instance',
            is_complete: false,
            creator: user.id,
            white_label_id: organizationId,
            parent_task_id: projectParentId,
            position: templateTask.position || getNextAvailablePosition(
              createdTasksArray.filter(t => t.parent_task_id === projectParentId),
              projectParentId
            ),
            default_duration: templateTask.default_duration || 1,
            duration_days: templateTask.duration_days || 1,
          };
          
          const childResult = await createTask(childTaskData);
          
          if (childResult.error) {
            console.error('Error creating child task:', childResult.error);
            continue;
          }
          
          createdTasksArray.push(childResult.data);
          templateToProjectMap[templateTask.id] = childResult.data.id;
        }
      }
      
      console.log(`Created ${createdTasksArray.length} tasks total`);
      
      // Use the old sequential calculation for initial setup, then let date system take over
      const tasksWithCalculatedDates = calculateSequentialStartDates(
        newProject.id,
        projectStartDate,
        createdTasksArray
      );
      
      console.log('Calculated dates for all tasks using sequential method');
      
      // Update all tasks with their calculated dates
      const updatePromises = [];
      
      for (const task of tasksWithCalculatedDates) {
        if (task.id === newProject.id && 
            task.start_date === newProject.start_date && 
            task.due_date === newProject.due_date) {
          continue;
        }
        
        const originalTask = createdTasksArray.find(t => t.id === task.id);
        if (!originalTask) continue;
        
        if (originalTask.start_date !== task.start_date || 
            originalTask.due_date !== task.due_date ||
            originalTask.duration_days !== task.duration_days) {
          
          console.log(`Updating task ${task.id} (${task.title || 'unnamed'}):`);
          console.log(` - Start: ${originalTask.start_date} → ${task.start_date}`);
          console.log(` - Due: ${originalTask.due_date} → ${task.due_date}`);
          console.log(` - Duration: ${originalTask.duration_days} → ${task.duration_days}`);
          
          updatePromises.push(
            updateTaskDateFields(task.id, {
              start_date: task.start_date,
              due_date: task.due_date,
              duration_days: task.duration_days
            })
          );
        }
      }
      
      if (updatePromises.length > 0) {
        console.log(`Updating dates for ${updatePromises.length} tasks`);
        await Promise.all(updatePromises);
      }
      
      // Refresh tasks to get the latest state
      await fetchTasks(true);
      
      return { data: newProject, error: null };
    } catch (err) {
      console.error('Error creating project from template:', err);
      return { data: null, error: err.message };
    }
  };

  // Helper function to get all template tasks in a hierarchy
  const getAllTemplateTasksInHierarchy = async (rootTemplateId) => {
    let templates = templateTasks;
    
    if (!templates || templates.length === 0) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('origin', 'template');
        
      if (error) throw new Error(error.message);
      templates = data || [];
    }
    
    const result = [];
    
    const collectTemplates = (parentId) => {
      const children = templates.filter(t => t.parent_task_id === parentId);
      result.push(...children);
      
      children.forEach(child => collectTemplates(child.id));
    };
    
    const rootTemplate = templates.find(t => t.id === rootTemplateId);
    if (rootTemplate) {
      result.push(rootTemplate);
      collectTemplates(rootTemplateId);
    }
    
    return result;
  };

  // Get all tasks in a hierarchy
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
    createTask: createNewTask,
    updateTask: updateTaskHandler,
    deleteTask: deleteTaskHandler,
    updateTaskAfterDragDrop,
    createProjectFromTemplate,

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