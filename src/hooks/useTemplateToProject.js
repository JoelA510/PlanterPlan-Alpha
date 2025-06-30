import { useState, useCallback } from 'react';
import { useAuth } from '../components/contexts/AuthContext';
import { useOrganization } from '../components/contexts/OrganizationProvider';
import { useLicenses } from './useLicenses';
import { useTaskCreation } from './useTaskCreation';
import { supabase } from '../supabaseClient';
import { getNextAvailablePosition } from '../utils/sparsePositioning';
import { calculateDueDate, calculateSequentialStartDates } from '../utils/dateUtils';
import { updateTaskDateFields } from '../services/taskService';

/**
 * Custom hook for converting templates to projects
 * Handles all the complex hierarchy creation, date calculations, and state management
 */
export const useTemplateToProject = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { validateProjectCreation } = useLicenses();
  const { createTask } = useTaskCreation();
  
  // Local state for conversion process
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState(null);
  const [conversionProgress, setConversionProgress] = useState({
    step: '',
    current: 0,
    total: 0,
    percentage: 0
  });

  /**
   * Create a project from a template with all hierarchy and date handling
   * @param {string} templateId - The template ID to convert
   * @param {Object} projectData - Project configuration data
   * @param {string} projectData.name - Project name
   * @param {string} projectData.startDate - Project start date
   * @param {string} licenseId - License ID for project creation (optional)
   * @param {Array} templateTasks - Current template tasks array
   * @param {Function} onProjectCreated - Callback when project is created
   * @returns {Promise<{data, error}>} - Result of conversion
   */
  const createProjectFromTemplate = useCallback(async (templateId, projectData, options = {}) => {
    const { 
      licenseId = null, 
      templateTasks = [], 
      onProjectCreated = null 
    } = options;

    try {
      setIsConverting(true);
      setConversionError(null);
      setConversionProgress({ step: 'Initializing...', current: 0, total: 1, percentage: 0 });

      console.log('Creating project from template:', templateId);
      
      if (!user?.id) {
        throw new Error('Cannot create project: User ID is missing');
      }
      
      if (!templateId) {
        throw new Error('Template ID is required');
      }
      
      // Find the root template
      const template = templateTasks.find(t => t.id === templateId);
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`);
      }

      // Validate license for project creation
      let validatedLicenseId = licenseId;
      const validation = validateProjectCreation(licenseId);
      if (!validation.canCreate) {
        throw new Error(validation.reason);
      }
      validatedLicenseId = validation.licenseId;

      setConversionProgress({ step: 'Analyzing template structure...', current: 1, total: 5, percentage: 20 });

      // Get all template tasks in the hierarchy
      const templateTasksTree = await getAllTemplateTasksInHierarchy(templateId, templateTasks);
      console.log(`Found ${templateTasksTree.length} template tasks in hierarchy`);

      if (templateTasksTree.length === 0) {
        throw new Error('No template tasks found in hierarchy');
      }

      setConversionProgress({ 
        step: 'Creating root project...', 
        current: 2, 
        total: 5, 
        percentage: 40 
      });

      // Create the root project task
      const rootProject = await createRootProjectFromTemplate(
        template, 
        projectData, 
        validatedLicenseId
      );

      setConversionProgress({ 
        step: 'Creating child tasks...', 
        current: 3, 
        total: 5, 
        percentage: 60 
      });

      // Create all child tasks in hierarchy order
      const { createdTasks, templateToProjectMap } = await createChildTasksFromTemplate(
        templateTasksTree,
        rootProject,
        validatedLicenseId
      );

      setConversionProgress({ 
        step: 'Calculating dates...', 
        current: 4, 
        total: 5, 
        percentage: 80 
      });

      // Calculate and apply proper dates to all tasks
      await calculateAndApplyProjectDates(createdTasks, projectData.startDate);

      setConversionProgress({ 
        step: 'Finalizing...', 
        current: 5, 
        total: 5, 
        percentage: 100 
      });

      console.log(`Successfully created project with ${createdTasks.length} tasks`);

      // Call success callback if provided
      if (onProjectCreated) {
        await onProjectCreated(rootProject, createdTasks);
      }

      return { data: rootProject, error: null };

    } catch (err) {
      console.error('Error creating project from template:', err);
      const errorMessage = err.message;
      setConversionError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setIsConverting(false);
      // Reset progress after a delay so user can see completion
      setTimeout(() => {
        setConversionProgress({ step: '', current: 0, total: 0, percentage: 0 });
      }, 2000);
    }
  }, [user?.id, organizationId, validateProjectCreation, createTask]);

  /**
   * Create the root project task from template
   */
  const createRootProjectFromTemplate = async (template, projectData, licenseId) => {
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
      parent_task_id: null,
      start_date: projectStartDate.toISOString(),
      default_duration: template.default_duration || 1,
      duration_days: effectiveDuration
    };
    
    // Calculate due date
    const calculatedDueDate = calculateDueDate(projectStartDate, effectiveDuration);
    if (calculatedDueDate) {
      projectBaseData.due_date = calculatedDueDate.toISOString();
    }
    
    // Create the root project using the task creation hook
    const result = await createTask(projectBaseData, licenseId);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    console.log('Created root project:', result.data);
    return result.data;
  };

  /**
   * Create all child tasks from template hierarchy
   */
  const createChildTasksFromTemplate = async (templateTasksTree, rootProject, licenseId) => {
    const createdTasks = [rootProject];
    const templateToProjectMap = { [templateTasksTree[0].id]: rootProject.id };
    
    // Organize tasks by hierarchy level
    const templateTasksByLevel = organizeTasksByLevel(templateTasksTree);
    const levels = Object.keys(templateTasksByLevel).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Create tasks level by level (excluding level 0 which is the root)
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
          parent_task_id: projectParentId,
          position: templateTask.position,
          default_duration: templateTask.default_duration || 1,
          duration_days: templateTask.duration_days || 1,
        };
        
        // Create the child task
        const childResult = await createTask(childTaskData, licenseId);
        
        if (childResult.error) {
          console.error('Error creating child task:', childResult.error);
          continue;
        }
        
        createdTasks.push(childResult.data);
        templateToProjectMap[templateTask.id] = childResult.data.id;
      }
    }
    
    return { createdTasks, templateToProjectMap };
  };

  /**
   * Calculate and apply proper dates to all created tasks
   */
  const calculateAndApplyProjectDates = async (createdTasks, startDateString) => {
    const projectStartDate = new Date(startDateString);
    
    // Find the root task
    const rootTask = createdTasks.find(t => !t.parent_task_id);
    if (!rootTask) {
      throw new Error('No root task found in created tasks');
    }
    
    // Use sequential date calculation for initial setup
    const tasksWithCalculatedDates = calculateSequentialStartDates(
      rootTask.id,
      projectStartDate,
      createdTasks
    );
    
    console.log('Calculated dates for all tasks using sequential method');
    
    // Update all tasks with their calculated dates
    const updatePromises = [];
    
    for (const task of tasksWithCalculatedDates) {
      const originalTask = createdTasks.find(t => t.id === task.id);
      if (!originalTask) continue;
      
      // Check if dates actually changed
      const datesChanged = 
        originalTask.start_date !== task.start_date || 
        originalTask.due_date !== task.due_date ||
        originalTask.duration_days !== task.duration_days;
      
      if (datesChanged) {
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
  };

  /**
   * Organize template tasks by hierarchy level
   */
  const organizeTasksByLevel = (templateTasksTree) => {
    const templateTasksByLevel = {};
    
    templateTasksTree.forEach(task => {
      let level = 0;
      let currentTask = task;
      
      // Calculate level by traversing up the hierarchy
      while (currentTask.parent_task_id) {
        level++;
        currentTask = templateTasksTree.find(t => t.id === currentTask.parent_task_id) || {};
      }
      
      if (!templateTasksByLevel[level]) {
        templateTasksByLevel[level] = [];
      }
      templateTasksByLevel[level].push(task);
    });
    
    return templateTasksByLevel;
  };

  /**
   * Get all template tasks in a hierarchy
   */
  const getAllTemplateTasksInHierarchy = async (rootTemplateId, templateTasks = []) => {
    let templates = templateTasks;
    
    // If no template tasks provided, fetch from database
    if (!templates || templates.length === 0) {
      console.log('Fetching template tasks from database...');
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('origin', 'template');
        
      if (error) throw new Error(error.message);
      templates = data || [];
    }
    
    const result = [];
    
    // Recursive function to collect all children
    const collectTemplates = (parentId) => {
      const children = templates.filter(t => t.parent_task_id === parentId);
      result.push(...children);
      
      children.forEach(child => collectTemplates(child.id));
    };
    
    // Start with the root template
    const rootTemplate = templates.find(t => t.id === rootTemplateId);
    if (rootTemplate) {
      result.push(rootTemplate);
      collectTemplates(rootTemplateId);
    }
    
    return result;
  };

  /**
   * Clear any conversion error state
   */
  const clearConversionError = useCallback(() => {
    setConversionError(null);
  }, []);

  /**
   * Reset conversion progress
   */
  const resetProgress = useCallback(() => {
    setConversionProgress({ step: '', current: 0, total: 0, percentage: 0 });
  }, []);

  /**
   * Check if we can start a conversion
   */
  const canConvert = !isConverting;

  return {
    // Main conversion function
    createProjectFromTemplate,
    
    // State
    isConverting,
    conversionError,
    conversionProgress,
    canConvert,
    
    // Actions
    clearConversionError,
    resetProgress,
    
    // Utility functions (exposed for advanced use cases)
    getAllTemplateTasksInHierarchy
  };
};