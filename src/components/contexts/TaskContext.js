import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
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

// Import functions from taskService directly if you're not using useTaskService
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

// Import the date utility functions
import { 
  calculateDueDate,
  calculateStartDate,
  updateDependentTaskDates
} from '../../utils/dateUtils';

// Replace the existing imports
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
  
  // State for tasks
  const [tasks, setTasks] = useState([]);
  const [instanceTasks, setInstanceTasks] = useState([]);
  const [templateTasks, setTemplateTasks] = useState([]);
  const [enhancedTasks, setEnhancedTasks] = useState([]);
  const [enhancedTasksMap, setEnhancedTasksMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const isMountedRef = useRef(true);
  
  // Template management state
  const [addingTemplateToId, setAddingTemplateToId] = useState(null);
  const [isAddingTopLevelTemplate, setIsAddingTopLevelTemplate] = useState(false);
  
  // License system state
  const [canCreateProject, setCanCreateProject] = useState(false);
  const [userHasProjects, setUserHasProjects] = useState(false);
  const [projectLimitReason, setProjectLimitReason] = useState('');
  const [userLicenses, setUserLicenses] = useState([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  
  // Refs for tracking state without triggering re-renders
  const initialFetchDoneRef = useRef(false);
  
  // Process tasks to add calculated properties
  // Modified function that creates a map of task IDs to calculated properties
  const processTasksWithCalculations = useCallback((rawTasks) => {
    if (!Array.isArray(rawTasks) || rawTasks.length === 0) return {};
    
    // Create a mapping object for the calculated properties
    const calculatedPropertiesMap = {};
    
    // First pass: determine which tasks have children
    const tasksWithChildren = {};
    rawTasks.forEach(task => {
      if (task && task.parent_task_id) {
        // Count children for each parent
        if (!tasksWithChildren[task.parent_task_id]) {
          tasksWithChildren[task.parent_task_id] = 0;
        }
        tasksWithChildren[task.parent_task_id]++;
      }
    });
    
    console.log("Tasks with children counts:", tasksWithChildren);
    
    // Second pass: calculate durations and due dates for each task
    rawTasks.forEach(task => {
      if (!task || !task.id) return; // Skip invalid tasks
      
      // Determine if this task has children
      const childCount = tasksWithChildren[task.id] || 0;
      const hasChildren = childCount > 0;
      
      console.log(`Processing task ${task.id} (${task.title}): hasChildren=${hasChildren}, childCount=${childCount}`);
      
      // Get the stored duration (default to 1 if not set)
      const storedDuration = task.duration_days || 1;
      
      // Calculate the effective duration based on children
      let calculatedDuration = storedDuration;
      if (hasChildren) {
        try {
          calculatedDuration = calculateParentDuration(task.id, rawTasks);
          // console.log(`  Calculated duration for ${task.id}: ${calculatedDuration} (stored: ${storedDuration})`);
        } catch (e) {
          console.error(`  Error calculating duration for task ${task.id}:`, e);
        }
      }
      
      // Calculate an effective due date if start date is available
      let calculatedDueDate = null;
      if (task.start_date) {
        try {
          const startDate = new Date(task.start_date);
          const dueDate = new Date(startDate);
          // Use the appropriate duration
          const effectiveDuration = hasChildren ? calculatedDuration : storedDuration;
          dueDate.setDate(startDate.getDate() + effectiveDuration);
          calculatedDueDate = dueDate.toISOString();
          // console.log(`  Calculated due date for ${task.id}: ${calculatedDueDate}`);
        } catch (e) {
          console.error(`  Error calculating due date for task ${task.id}:`, e);
        }
      }
      
      // Store the calculated properties in the map
      calculatedPropertiesMap[task.id] = {
        hasChildren,
        childCount,
        calculatedDuration,
        effectiveDuration: hasChildren ? calculatedDuration : storedDuration,
        calculatedDueDate,
        // Add a timestamp for debugging
        calculatedAt: new Date().toISOString()
      };
    });
    
    console.log("Final calculated properties map:", calculatedPropertiesMap);
    // setEnhancedTasksMap(calculatedPropertiesMap);
    return calculatedPropertiesMap;
  }, []);

  // Updated helper function to get enhanced task properties
  const getEnhancedTask = useCallback((taskId) => {
    if (!taskId) return null;
    
    // Find the base task
    const baseTask = tasks.find(t => t.id === taskId);
    if (!baseTask) return null;
    
    // Get the enhanced properties (with fallbacks)
    const enhancedProps = enhancedTasksMap[taskId] || {
      hasChildren: false,
      childCount: 0,
      calculatedDuration: baseTask.duration_days || 1,
      effectiveDuration: baseTask.duration_days || 1,
      calculatedDueDate: baseTask.due_date
    };
    
    // Return a new object combining the base task and enhanced properties
    return {
      ...baseTask,
      ...enhancedProps
    };
  }, [tasks, enhancedTasksMap]);

  // Update tasks state safely - DEFINE THIS FIRST since it's used by other functions
  const updateTasks = useCallback((newTasks) => {
    if (!Array.isArray(newTasks)) {
      console.error('updateTasks received non-array value:', newTasks);
      return;
    }
    
    try {
      // Process the tasks to get calculated properties map
      const calculatedPropertiesMap = processTasksWithCalculations(newTasks);
      
      // Update the enhanced tasks state with the map
      setEnhancedTasksMap(calculatedPropertiesMap);
      
      // Group tasks by origin as before
      const instance = newTasks.filter(task => task.origin === "instance");
      const template = newTasks.filter(task => task.origin === "template");
      
      // Update original task states
      setTasks(newTasks);
      setInstanceTasks(instance);
      setTemplateTasks(template);
    } catch (err) {
      console.error('Error in updateTasks:', err);
    }
  }, [processTasksWithCalculations]);
  
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
      const allTasks = [...instanceData, ...templateData];
      setTasks(allTasks);
      setError(null);

      // Process and set enhanced tasks
      const enhanced = processTasksWithCalculations(allTasks);
      // console.log("fetch", enhanced);
      setEnhancedTasksMap(enhanced);
      
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
  }, [organizationId, user?.id, instanceTasks, templateTasks, processTasksWithCalculations]);
  
  // Create a new task with date handling
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
        // If user has projects but no license is provided, block creation
        if (userHasProjects && !licenseId) {
          throw new Error('You already have a project. Please provide a license key to create additional projects.');
        }
      }
      
      // Handle date calculations
      let enhancedTaskData = {
        ...taskData,
        creator: user.id,
        origin: taskData.origin || "instance",
        white_label_id: organizationId,
        license_id: licenseId
      };
      
      // If this is a child task and has days_from_start_until set
      if (taskData.parent_task_id && taskData.days_from_start_until_due !== undefined) {
        // Find the parent task
        const parentTask = tasks.find(t => t.id === taskData.parent_task_id);
        
        if (parentTask && parentTask.start_date) {
          // Calculate start date based on parent's start date and days_from_start_until
          const calculatedStartDate = calculateStartDate(
            parentTask.start_date,
            taskData.days_from_start_until_due
          );
          
          if (calculatedStartDate) {
            // Format as ISO string for database
            enhancedTaskData.start_date = calculatedStartDate.toISOString();
            
            // If task has a default_duration, calculate the due date
            if (taskData.duration_days) {
              const calculatedDueDate = calculateDueDate(
                calculatedStartDate,
                taskData.duration_days
              );
              
              if (calculatedDueDate) {
                enhancedTaskData.due_date = calculatedDueDate.toISOString();
              }
            }
          }
        }
      }
      // If this task has start_date and default_duration but no due_date
      else if (taskData.start_date && taskData.duration_days && !taskData.due_date) {
        const calculatedDueDate = calculateDueDate(
          taskData.start_date,
          taskData.duration_days
        );
        
        if (calculatedDueDate) {
          enhancedTaskData.due_date = calculatedDueDate.toISOString();
        }
      }
      
      console.log('Enhanced task data:', enhancedTaskData);
      
      // Use the createTask function
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
        
        // Update dates for child tasks if any dates changed in the parent
        if (taskData.parent_task_id) {
          // Update dates for all tasks under the parent
          const updatedTasks = updateDependentTaskDates(
            taskData.parent_task_id,
            [...tasks, result.data]
          );
          
          // Update all task arrays with the recalculated dates
          updateTasks(updatedTasks);
          
          // Update affected tasks in database
          for (const updatedTask of updatedTasks) {
            // Skip the newly created task (already saved with correct dates)
            if (updatedTask.id === result.data.id) continue;
            
            // Only update tasks with changed dates
            const originalTask = tasks.find(t => t.id === updatedTask.id);
            if (originalTask && (
              originalTask.start_date !== updatedTask.start_date ||
              originalTask.due_date !== updatedTask.due_date
            )) {
              await updateTaskDateFields(updatedTask.id, {
                start_date: updatedTask.start_date,
                due_date: updatedTask.due_date
              });
            }
          }
        }
        
        
        // Reset template creation state
        setAddingTemplateToId(null);
        setIsAddingTopLevelTemplate(false);
      }
      
      return { data: result.data, error: null };
    } catch (err) {
      console.error('Error creating task:', err);
      return { data: null, error: err.message };
    }
  }, [user?.id, organizationId, userHasProjects, tasks, updateTasks]);
  
/**
 * Updates a task including cascading duration updates for templates
 */
/**
 * Updates a task including recalculating due dates based on calculated durations
 */
const updateTaskHandler = async (taskId, updatedTaskData) => {
  try {
    // Find the original task
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) {
      throw new Error('Task not found');
    }
    
    // First perform the regular update
    const result = await updateTaskComplete(taskId, updatedTaskData);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update task');
    }
    
    // Update all tasks with the new data
    let updatedTaskList = tasks.map(task => 
      task.id === taskId ? { ...task, ...result.data } : task
    );
    
    // Now, check if this task has children or is a child of another task
    const hasChildren = updatedTaskList.some(t => t.parent_task_id === taskId);
    const parentId = originalTask.parent_task_id;
    
    // If this task has children, we need to update its due date based on calculated duration
    if (hasChildren) {
      // Calculate the effective duration
      const calculatedDuration = calculateParentDuration(taskId, updatedTaskList);
      
      // If the calculated duration differs from stored, update the due date
      if (calculatedDuration !== (originalTask.duration_days || 1)) {
        const task = updatedTaskList.find(t => t.id === taskId);
        
        if (task && task.start_date) {
          // Calculate new due date based on start date + calculated duration
          const startDate = new Date(task.start_date);
          const newDueDate = new Date(startDate);
          newDueDate.setDate(newDueDate.getDate() + calculatedDuration);
          
          // Update the task's due date in the database
          const dateUpdateResult = await updateTaskDateFields(taskId, {
            due_date: newDueDate.toISOString()
          });
          
          if (!dateUpdateResult.success) {
            console.warn('Failed to update task due date:', dateUpdateResult.error);
          } else {
            // Update the task in our list
            updatedTaskList = updatedTaskList.map(t => 
              t.id === taskId ? { ...t, due_date: newDueDate.toISOString() } : t
            );
          }
        }
      }
    }
    
    // If this task has a parent, we need to update the parent's due date
    if (parentId) {
      // Recalculate parent due date
      const parentCalculatedDuration = calculateParentDuration(parentId, updatedTaskList);
      const parent = updatedTaskList.find(t => t.id === parentId);
      
      if (parent && parent.start_date) {
        // Calculate new due date for parent
        const parentStartDate = new Date(parent.start_date);
        const newParentDueDate = new Date(parentStartDate);
        newParentDueDate.setDate(newParentDueDate.getDate() + parentCalculatedDuration);
        
        // Update parent due date
        const parentUpdateResult = await updateTaskDateFields(parentId, {
          due_date: newParentDueDate.toISOString()
        });
        
        if (!parentUpdateResult.success) {
          console.warn('Failed to update parent task due date:', parentUpdateResult.error);
        } else {
          // Update the parent in our list
          updatedTaskList = updatedTaskList.map(t => 
            t.id === parentId ? { ...t, due_date: newParentDueDate.toISOString() } : t
          );
        }
      }
    }
    
    // Update the state with our modified list
    updateTasks(updatedTaskList);
    
    return { success: true, data: result.data };
  } catch (err) {
    console.error('Error updating task:', err);
    return { success: false, error: err.message };
  }
};
  // Update a task's date fields
  const updateTaskDates = useCallback(async (taskId, dateData) => {
    try {
      console.log('Updating task dates:', taskId, dateData);
      
      // Find the task to update
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) {
        throw new Error('Task not found');
      }
      
      // Calculate due date if start_date and default_duration are provided but due_date is not
      let enhancedDateData = { ...dateData };
      
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
      
      // Create updated task lists
      const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
      
      // If this task has children, we need to update their dates too
      const hasChildren = tasks.some(t => t.parent_task_id === taskId);
      
      if (hasChildren) {
        // Recalculate dates for all child tasks
        const tasksWithUpdatedDates = updateDependentTaskDates(taskId, updatedTasks);
        
        // Update all tasks in the state
        updateTasks(tasksWithUpdatedDates);
        
        // Update child tasks in database
        const childTasks = tasksWithUpdatedDates.filter(t => t.parent_task_id === taskId);
        
        for (const childTask of childTasks) {
          const originalChild = tasks.find(t => t.id === childTask.id);
          
          // Only update if dates actually changed
          if (originalChild && (
            originalChild.start_date !== childTask.start_date ||
            originalChild.due_date !== childTask.due_date
          )) {
            await updateTaskDateFields(childTask.id, {
              start_date: childTask.start_date,
              due_date: childTask.due_date
            });
          }
        }
      } else {
        // No children, just update this task
        updateTasks(updatedTasks);
      }
      
      return { success: true, data: updatedTask };
    } catch (err) {
      console.error('Error updating task dates:', err);
      return { success: false, error: err.message };
    }
  }, [tasks, updateTasks]);
  
  // Template-specific functions
  
  // Handle adding a template (either top-level or child)
  const handleAddTemplate = useCallback((parentId = null) => {
    if (parentId) {
      setAddingTemplateToId(parentId);
      setIsAddingTopLevelTemplate(false);
    } else {
      setIsAddingTopLevelTemplate(true);
      setAddingTemplateToId(null);
    }
  }, []);
  
  // Cancel adding a template
  const cancelAddTemplate = useCallback(() => {
    setAddingTemplateToId(null);
    setIsAddingTopLevelTemplate(false);
  }, []);
  
  /**
 * Create a template with proper position calculation and cascade duration updates
 */
  const createTemplate = useCallback(async (templateData) => {
    try {
      console.log("Creating template with data:", JSON.stringify(templateData, null, 2));
      
      // Determine position for new template
      let position = 0;
      
      if (templateData.parent_task_id) {
        const siblingTemplates = templateTasks.filter(t => 
          t.parent_task_id === templateData.parent_task_id
        );
        position = siblingTemplates.length > 0 
          ? Math.max(...siblingTemplates.map(t => t.position || 0)) + 1 
          : 0;
      } else {
        const topLevelTemplates = templateTasks.filter(t => !t.parent_task_id);
        position = topLevelTemplates.length > 0 
          ? Math.max(...topLevelTemplates.map(t => t.position || 0)) + 1 
          : 0;
      }
      
      // Add position and origin to template data
      const enhancedTemplateData = {
        ...templateData,
        position,
        origin: 'template'
      };
      
      // Call create task function
      const result = await createNewTask(enhancedTemplateData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // If this template has a parent, update the parent's duration
      if (templateData.parent_task_id && result.data) {
        // Get the latest templates including the new one
        const newTask = result.data;
        const allTemplates = [...templateTasks, newTask];
        
        // Update parent durations and recalculate dates
        const updatedTasks = updateAncestorDurations(newTask.id, allTemplates);
        
        // Get tasks that need database updates
        const tasksToUpdate = getTasksRequiringUpdates(allTemplates, updatedTasks);
        
        // Update tasks in database
        await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
        
        // Update state with new calculated durations
        setTemplateTasks(updatedTasks.filter(t => t.origin === 'template'));
        setTasks(prev => {
          // Replace templates while keeping instance tasks
          const instanceTasks = prev.filter(t => t.origin === 'instance');
          return [...instanceTasks, ...updatedTasks.filter(t => t.origin === 'template')];
        });
      }
      
      return result;
    } catch (err) {
      console.error('Error creating template:', err);
      return { error: err.message };
    }
  }, [templateTasks, createNewTask, updateTaskComplete, setTemplateTasks, setTasks]);
  
  /**
 * Deletes a task and all its children with duration updates
 */
  const deleteTaskHandler = useCallback(async (taskId, deleteChildren = true) => {
    try {
      // Find the task
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) {
        throw new Error('Task not found');
      }
      
      console.log(`Deleting task ${taskId} (with children: ${deleteChildren})`);
      
      // Store parent ID to update dates for siblings later
      const parentId = taskToDelete.parent_task_id;
      const isTemplate = taskToDelete.origin === 'template';
      
      // Use the deleteTask function
      const result = await deleteTask(taskId, deleteChildren);
      
      if (!result.success) {
        // Error handling for date issues (keep your existing code)
        if (result.error && (
          result.error.includes("Invalid time value") || 
          result.error.includes("Invalid date")
        )) {
          console.warn("Date calculation issue during deletion, continuing with UI update");
          
          // Get IDs of children to be removed (keep your existing code)
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
          
          // Create updatedTasks without the deleted ones
          const updatedTaskList = tasks.filter(task => !allTaskIdsToDelete.includes(task.id));
          
          // If this was a template with a parent, update the parent's duration
          if (isTemplate && parentId) {
            // Update parent and reorder siblings
            const reorderedTasks = updateAfterReordering(parentId, updatedTaskList);
            
            // If parent has duration changes, update ancestors
            const parent = reorderedTasks.find(t => t.id === parentId);
            if (parent) {
              const newDuration = calculateParentDuration(parentId, reorderedTasks);
              if (parent.duration_days !== newDuration) {
                const tasksWithUpdatedDurations = updateAncestorDurations(parentId, reorderedTasks);
                
                // Get tasks that need database updates
                const tasksToUpdate = getTasksRequiringUpdates(updatedTaskList, tasksWithUpdatedDurations);
                await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
                
                // Update state
                updateTasks(tasksWithUpdatedDurations);
                return { 
                  success: true, 
                  deletedIds: allTaskIdsToDelete,
                  hasChildren: childTaskIds.length > 0
                };
              }
            }
            
            // Update state with just reordered tasks
            updateTasks(reorderedTasks);
          } else {
            // Just update without the deleted tasks
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
        // Create updated tasks without the deleted ones
        const updatedTaskList = tasks.filter(task => !result.deletedIds.includes(task.id));
        
        console.log(`Deleted ${result.deletedIds.length} tasks`);
        
        // If this was a template with a parent, update the parent's duration
        if (isTemplate && parentId) {
          // Update parent with new duration and reorder siblings
          const reorderedTasks = updateAfterReordering(parentId, updatedTaskList);
          
          // Check if parent duration changed
          const parent = reorderedTasks.find(t => t.id === parentId);
          if (parent) {
            const newDuration = calculateParentDuration(parentId, reorderedTasks);
            if (parent.duration_days !== newDuration) {
              // Calculate all duration and date updates
              const withUpdatedDurations = updateAncestorDurations(parentId, reorderedTasks);
              
              // Update database with changes
              const tasksToUpdate = getTasksRequiringUpdates(updatedTaskList, withUpdatedDurations);
              await updateTasksInDatabase(tasksToUpdate, updateTaskComplete);
              
              // Update state
              updateTasks(withUpdatedDurations);
              return { 
                success: true, 
                deletedIds: result.deletedIds,
                hasChildren: result.deletedIds.length > 1
              };
            }
          }
          
          // Update state with just reordered tasks
          updateTasks(reorderedTasks);
        } else {
          // Update all task arrays without updating durations
          updateTasks(updatedTaskList);
        }
      }
      
      return { 
        success: true, 
        deletedIds: result.deletedIds,
        hasChildren: result.deletedIds && result.deletedIds.length > 1
      };
    } catch (err) {
      console.error('Error deleting task:', err);
      
      // Return a more specific error for dates
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
  }, [tasks, deleteTask, updateTaskComplete, updateTasks]);
  
  // License system functions
  
  // Check if user can create a new project
  const checkForExistingProjects = useCallback(async () => {
    if (!user?.id) return false;
    
    try {
      const { hasProjects } = await checkUserExistingProjects(user.id);
      setUserHasProjects(hasProjects);
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
      let { data, error } = await supabase
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

  // Function to create a new project from a template
/**
 * Create a new project from a template with proper date handling
 * @param {string} templateId - ID of the template to use
 * @param {Object} projectData - Basic project data including start date
 * @param {string} licenseId - Optional license ID for the project
 */
const createProjectFromTemplate = async (templateId, projectData, licenseId = null) => {
  try {
    console.log('Creating project from template:', templateId);
    
    if (!user?.id) {
      throw new Error('Cannot create project: User ID is missing');
    }
    
    if (!templateId) {
      throw new Error('Template ID is required');
    }
    
    // Find the template to clone
    const template = templateTasks.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
    
    // Calculate the effective duration for the template (use calculated duration if it has children)
    let effectiveDuration = template.duration_days || 1;
    const templateChildren = templateTasks.filter(t => t.parent_task_id === templateId);
    
    if (templateChildren.length > 0) {
      // Calculate the sum of child durations
      effectiveDuration = calculateParentDuration(templateId, templateTasks);
      console.log(`Using calculated duration for project: ${effectiveDuration} days (stored: ${template.duration_days} days)`);
    }
    
    // Set the project start date (from user input or default to today)
    const projectStartDate = projectData.startDate ? new Date(projectData.startDate) : new Date();
    
    // Prepare the initial project data
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
      parent_task_id: null, // Top-level project
      position: 0, // Will be at the top of the projects list
      duration_days: template.duration_days // Store original duration from template
    };
    
    // Calculate the project due date based on EFFECTIVE duration
    const calculatedDueDate = calculateDueDate(
      projectStartDate,
      effectiveDuration
    );
    
    if (calculatedDueDate) {
      projectBaseData.due_date = calculatedDueDate.toISOString();
    }
    
    // Create the top-level project
    const result = await createTask(projectBaseData);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Store the created project
    const newProject = result.data;
    
    // Track template-to-project ID mapping
    const templateToProjectMap = {
      [templateId]: newProject.id
    };
    
    // Collect all template tasks in a hierarchical structure
    const allTemplateTasks = [];
    const buildTemplateHierarchy = (parentTemplateId = templateId) => {
      // Get direct children of this parent
      const children = templateTasks.filter(t => t.parent_task_id === parentTemplateId);
      
      // Sort children by position
      children.sort((a, b) => a.position - b.position);
      
      // Add children to our collection
      allTemplateTasks.push(...children);
      
      // Recursively process each child's children
      children.forEach(child => buildTemplateHierarchy(child.id));
    };
    
    // Build the full hierarchy
    buildTemplateHierarchy();
    
    // Group tasks by their level in the hierarchy for sequential processing
    const tasksByLevel = {};
    allTemplateTasks.forEach(task => {
      // Determine task level (by counting parents)
      let level = 1; // Start at level 1 (direct children of the root)
      let currentParentId = task.parent_task_id;
      
      while (currentParentId !== templateId) {
        level++;
        const parent = templateTasks.find(t => t.id === currentParentId);
        if (!parent) break; // Safety check
        currentParentId = parent.parent_task_id;
      }
      
      // Add to the appropriate level group
      if (!tasksByLevel[level]) tasksByLevel[level] = [];
      tasksByLevel[level].push(task);
    });
    
    // Process each level in order (breadth-first approach)
    const levels = Object.keys(tasksByLevel).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const level of levels) {
      const tasksAtLevel = tasksByLevel[level];
      
      // Group by parent to handle sequential timing within each parent
      const tasksByParent = {};
      tasksAtLevel.forEach(task => {
        if (!tasksByParent[task.parent_task_id]) tasksByParent[task.parent_task_id] = [];
        tasksByParent[task.parent_task_id].push(task);
      });
      
      // Process each parent group
      for (const [templateParentId, childTasks] of Object.entries(tasksByParent)) {
        // Look up the corresponding project parent ID
        const projectParentId = templateToProjectMap[templateParentId];
        
        if (!projectParentId) {
          console.error(`Missing project parent ID for template parent ${templateParentId}`);
          continue;
        }
        
        // Get the parent's start date
        let parentStartDate;
        if (templateParentId === templateId) {
          // This is a direct child of the root template
          parentStartDate = projectStartDate;
        } else {
          // Find the created parent task
          const { data: parentTask } = await supabase
            .from('tasks')
            .select('start_date')
            .eq('id', projectParentId)
            .single();
            
          if (parentTask && parentTask.start_date) {
            parentStartDate = new Date(parentTask.start_date);
          } else {
            parentStartDate = projectStartDate;
          }
        }
        
        // Calculate and create children sequentially
        let currentDate = new Date(parentStartDate);
        
        for (const childTemplate of childTasks) {
          // Use calculated duration for parent tasks, stored duration for leaf tasks
          const childChildren = templateTasks.filter(t => t.parent_task_id === childTemplate.id);
          let effectiveChildDuration = childTemplate.duration_days || 1;
          
          if (childChildren.length > 0) {
            // This child is a parent - use calculated duration
            effectiveChildDuration = calculateParentDuration(childTemplate.id, templateTasks);
            console.log(`Using calculated duration for task ${childTemplate.title}: ${effectiveChildDuration} days (stored: ${childTemplate.duration_days} days)`);
          }
          
          // Calculate child dates
          const startDate = new Date(currentDate);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + effectiveChildDuration);
          
          // Create the child task
          const childData = {
            title: childTemplate.title,
            description: childTemplate.description,
            purpose: childTemplate.purpose,
            actions: childTemplate.actions || [],
            resources: childTemplate.resources || [],
            origin: 'instance',
            is_complete: false,
            creator: user.id,
            white_label_id: organizationId,
            parent_task_id: projectParentId,
            position: childTemplate.position || 0,
            duration_days: childTemplate.duration_days, // Still store original duration
            start_date: startDate.toISOString(),
            due_date: endDate.toISOString() // But use effective duration for due date
          };
          
          const childResult = await createTask(childData);
          
          if (childResult.error) {
            console.error('Error creating child task:', childResult.error);
            continue;
          }
          
          // Store the mapping from template ID to project task ID
          templateToProjectMap[childTemplate.id] = childResult.data.id;
          
          // Update the date for the next task
          currentDate = new Date(endDate);
        }
      }
    }
    
    // Refresh tasks to include the new project
    await fetchTasks(true);
    
    return { data: newProject, error: null };
  } catch (err) {
    console.error('Error creating project from template:', err);
    return { data: null, error: err.message };
  }
};
  
  // Initial fetch when component mounts
  useEffect(() => {
    if (userLoading || orgLoading) {
      return;
    }
    
    if (!initialFetchDoneRef.current && user?.id) {
      fetchTasks();
      // fetchUserLicenses();
      checkForExistingProjects();
    }
  // }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks, checkProjectCreationAbility, fetchUserLicenses, checkForExistingProjects]);
  }, [user?.id, organizationId, userLoading, orgLoading, fetchTasks, checkForExistingProjects]);
  
  useEffect(() => {
    // Set the ref to true on mount
    isMountedRef.current = true;
    
    // Clean up function to set ref to false on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    deleteTask: deleteTaskHandler,
    // Date-specific functions
    updateTaskDates,
    // Expose additional task service functions directly
    updateTaskPosition,
    updateSiblingPositions,
    updateTaskCompletion,
    
    // Template management
    addingTemplateToId,
    isAddingTopLevelTemplate,
    handleAddTemplate,
    cancelAddTemplate,
    createTemplate,
    
    // License system
    canCreateProject,
    projectLimitReason,
    // userLicenses,
    selectedLicenseId,
    userHasProjects,
    isCheckingLicense,
    fetchUserLicenses,
    applyLicenseKey,
    selectLicense,
    // getSelectedLicense,
    setTasks: updateTasks,
    createTask: createNewTask,
    deleteTask: deleteTaskHandler,
    updateTask: updateTaskHandler, 
    createProjectFromTemplate,
    enhancedTasksMap,
    getEnhancedTask,
    
  };
  
  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext;