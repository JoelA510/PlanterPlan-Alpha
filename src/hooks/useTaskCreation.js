import { useState, useCallback } from 'react';
import { useAuth } from '../components/contexts/AuthContext';
import { useOrganization } from '../components/contexts/OrganizationProvider';
import { useLicenses } from './useLicenses';
import { createTask as apiCreateTask } from '../services/taskService';
import { getNextAvailablePosition } from '../utils/sparsePositioning';
import { 
  calculateDueDate,
  calculateStartDate,
  determineTaskStartDate,
} from '../utils/dateUtils';

/**
 * Custom hook for task creation with all the complex business logic
 * Handles license validation, positioning, date calculations, and error states
 */
export const useTaskCreation = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { validateProjectCreation } = useLicenses();
  
  // Local state for creation process
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState(null);

  /**
   * Create a new task with all business logic handled
   * @param {Object} taskData - The basic task data
   * @param {Object} options - Additional options
   * @param {string} options.licenseId - License ID for project creation
   * @param {Array} options.existingTasks - Current tasks array for calculations
   * @param {Function} options.onTaskCreated - Callback when task is created
   * @returns {Promise<{data, error}>} - Result of creation
   */
  const createTask = useCallback(async (taskData, options = {}) => {
    const { 
      licenseId = null, 
      existingTasks = [], 
      onTaskCreated = null 
    } = options;

    try {
      setIsCreating(true);
      setCreationError(null);

      console.log('Creating task with data:', taskData);
      console.log('License key', licenseId);
      
      if (!user?.id) {
        throw new Error('Cannot create task: User ID is missing');
      }
      
      // Check if this is a top-level project creation
      const isTopLevelProject = !taskData.parent_task_id && taskData.origin === "instance";
      
      // For top-level projects, check if the user already has projects
      let validatedLicenseId = licenseId;
      if (isTopLevelProject) {
        const validation = validateProjectCreation(licenseId);
        if (!validation.canCreate) {
          throw new Error(validation.reason);
        }
        validatedLicenseId = validation.licenseId;
      }
      
      // Prepare enhanced task data
      let enhancedTaskData = {
        ...taskData,
        creator: user.id,
        origin: taskData.origin || "instance",
        white_label_id: organizationId,
        license_id: validatedLicenseId
      };
      
      // Calculate sparse position if not explicitly provided
      if (enhancedTaskData.position === undefined) {
        enhancedTaskData.position = getNextAvailablePosition(existingTasks, taskData.parent_task_id);
        console.log('Calculated sparse position:', enhancedTaskData.position, 'for parent:', taskData.parent_task_id);
      }
      
      // Handle date calculations
      enhancedTaskData = await calculateTaskDates(enhancedTaskData, existingTasks, isTopLevelProject);
      
      console.log('Enhanced task data with sparse positioning:', enhancedTaskData);
      
      // Create the task in database
      const result = await apiCreateTask(enhancedTaskData);
      
      if (result.error) {
        console.error('Error from createTask API:', result.error);
        throw new Error(result.error);
      }
      
      console.log('Task created successfully:', result.data);
      
      // Call success callback if provided
      if (onTaskCreated && result.data) {
        await onTaskCreated(result.data);
      }
      
      return { data: result.data, error: null };
    } catch (err) {
      console.error('Error creating task:', err);
      const errorMessage = err.message;
      setCreationError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  }, [user?.id, organizationId, validateProjectCreation]);

  /**
   * Calculate appropriate dates for the new task
   * @param {Object} taskData - The task data
   * @param {Array} existingTasks - Current tasks for calculations
   * @param {boolean} isTopLevelProject - Whether this is a top-level project
   * @returns {Object} - Enhanced task data with calculated dates
   */
  const calculateTaskDates = async (taskData, existingTasks, isTopLevelProject) => {
    let enhancedData = { ...taskData };

    // For initial date setting, use fallback calculations
    // The date cache system will recalculate these properly after creation
    if (taskData.parent_task_id) {
      const calculatedStartDate = determineTaskStartDate({
        ...enhancedData,
      }, existingTasks);
      
      if (calculatedStartDate) {
        enhancedData.start_date = calculatedStartDate.toISOString();
        
        if (taskData.duration_days) {
          const calculatedDueDate = calculateDueDate(
            calculatedStartDate,
            taskData.duration_days
          );
          
          if (calculatedDueDate) {
            enhancedData.due_date = calculatedDueDate.toISOString();
          }
        }
      } else if (taskData.days_from_start_until_due !== undefined) {
        const parentTask = existingTasks.find(t => t.id === taskData.parent_task_id);
        
        if (parentTask && parentTask.start_date) {
          const fallbackDate = calculateStartDate(
            parentTask.start_date,
            taskData.days_from_start_until_due
          );
          
          if (fallbackDate) {
            enhancedData.start_date = fallbackDate.toISOString();
            
            if (taskData.duration_days) {
              const calculatedDueDate = calculateDueDate(
                fallbackDate,
                taskData.duration_days
              );
              
              if (calculatedDueDate) {
                enhancedData.due_date = calculatedDueDate.toISOString();
              }
            }
          }
        }
      }
    } else if (isTopLevelProject && !enhancedData.start_date) {
      const currentDate = new Date();
      enhancedData.start_date = currentDate.toISOString();
      
      if (enhancedData.duration_days) {
        const calculatedDueDate = calculateDueDate(
          currentDate,
          enhancedData.duration_days
        );
        
        if (calculatedDueDate) {
          enhancedData.due_date = calculatedDueDate.toISOString();
        }
      }
    }

    return enhancedData;
  };

  /**
   * Clear any creation error state
   */
  const clearCreationError = useCallback(() => {
    setCreationError(null);
  }, []);

  /**
   * Check if we're currently in the middle of creating a task
   */
  const canCreate = !isCreating;

  return {
    // Main creation function
    createTask,
    
    // State
    isCreating,
    creationError,
    canCreate,
    
    // Actions
    clearCreationError
  };
};