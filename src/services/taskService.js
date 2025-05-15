// src/services/taskService.js
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/contexts/AuthContext';

// Helper function to check if error is due to connection/auth issues
const isConnectionError = (error) => {
  if (!error) return false;
  
  return (
    error.code === 'PGRST301' || 
    error.code === '401' || 
    error.message?.includes('JWT') ||
    error.message?.includes('auth') ||
    error.message?.includes('network') ||
    error.message?.includes('connection')
  );
};

/**
 * Hook that returns enhanced task service functions with auto-reconnection
 */
export const useTaskService = () => {
  const { refreshConnection } = useAuth();
  
  /**
   * Fetches all tasks from Supabase with auto-reconnection
   * @param {string} organizationId - Organization ID to filter tasks by
   * @param {string} userId - User ID to filter tasks by (for instance tasks)
   * @param {string} origin - Filter by task origin ("instance" or "template")
   * @returns {Promise<{data: Array, error: string}>} - The fetched task data or error
   */
  const fetchAllTasks = async (organizationId = null, userId = null, origin = null) => {
    try {
      // Start building the query
      let query = supabase.from('tasks').select('*');
      
      // Add filters if provided
      if (organizationId) {
        query = query.eq('white_label_id', organizationId);
      }
      
      if (userId) {
        query = query.eq('creator', userId);
      }
      
      if (origin) {
        query = query.eq('origin', origin);
      }
      
      // Execute the query
      let { data, error } = await query;
      
      // If there's a connection error, try to reconnect and retry
      if (error && isConnectionError(error)) {
        console.log('Connection error detected, trying to reconnect...');
        const reconnected = await refreshConnection();
        
        if (reconnected) {
          // Rebuild and retry the query after reconnection
          query = supabase.from('tasks').select('*');
          
          if (organizationId) {
            query = query.eq('white_label_id', organizationId);
          }
          
          if (userId) {
            query = query.eq('creator', userId);
          }
          
          if (origin) {
            query = query.eq('origin', origin);
          }
          
          const retry = await query;
          data = retry.data;
          error = retry.error;
        }
      }
      
      if (error) {
        console.error('Supabase error:', error);
        return { error: error.message || 'Failed to fetch tasks from Supabase' };
      }
      
      // Log the count of fetched tasks
      console.log(`Fetched ${data?.length || 0} tasks`);
      
      return { data };
    } catch (err) {
      console.error('Error fetching tasks:', err);
      return { error: err.message || 'Unknown error occurred while fetching tasks' };
    }
  };
  
  /**
   * Creates a new task with auto-reconnection
   * @param {Object} taskData - The task data to create
   * @returns {Promise<{data: Object, error: string}>} - The result
   */
  const createTask = async (taskData) => {
    try {
      console.log('Creating task with data:', JSON.stringify(taskData, null, 2));
      
      // Ensure required fields are present
      const requiredFields = ['title', 'origin'];
      const missingFields = requiredFields.filter(field => !taskData[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        return { error: `Missing required fields: ${missingFields.join(', ')}` };
      }
      
      // Normalize the taskData to avoid issues
      const normalizedData = {
        ...taskData,
        // Ensure parent_task_id is null if not provided
        parent_task_id: taskData.parent_task_id || null,
      };
      
      // Ensure due_date is in the correct format if provided
      if (normalizedData.due_date && !(normalizedData.due_date instanceof Date)) {
        try {
          normalizedData.due_date = new Date(normalizedData.due_date);
        } catch (e) {
          console.warn('Failed to parse due_date, setting to null', e);
          normalizedData.due_date = null;
        }
      }
      
      // Try to create the task
      let { data, error } = await supabase
        .from('tasks')
        .insert([normalizedData])
        .select();
      
      // If there's a connection error, try to reconnect and retry
      if (error && isConnectionError(error)) {
        console.log('Connection error detected, trying to reconnect...');
        const reconnected = await refreshConnection();
        
        if (reconnected) {
          // Retry the operation after reconnection
          const retry = await supabase
            .from('tasks')
            .insert([normalizedData])
            .select();
          
          data = retry.data;
          error = retry.error;
        }
      }
      
      if (error) {
        console.error('Supabase error:', error);
        return { error: error.message || 'Failed to create task in Supabase' };
      }
      
      console.log('Successfully created task:', data);
      return { data: data[0] };
    } catch (err) {
      console.error('Error creating task:', err);
      return { error: err.message || 'Unknown error occurred' };
    }
  };
  
  /**
   * Updates a task's position with auto-reconnection
   * @param {string} taskId - ID of the task to update
   * @param {string} parentId - New parent task ID
   * @param {number} position - New position value
   * @returns {Promise<{success: boolean, error: string}>} - Success status and any error
   */
  const updateTaskPosition = async (taskId, parentId, position) => {
    try {
      console.log(`Updating task position: taskId=${taskId}, parentId=${parentId}, position=${position}`);
      
      // Validate input
      if (!taskId) {
        return { success: false, error: 'Task ID is required' };
      }
      
      // Prepare the update data
      const updateData = {
        parent_task_id: parentId,
        position: position
      };
      
      // Update the task in Supabase
      let { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();
      
      // If there's a connection error, try to reconnect and retry
      if (error && isConnectionError(error)) {
        console.log('Connection error detected, trying to reconnect...');
        const reconnected = await refreshConnection();
        
        if (reconnected) {
          // Retry the operation after reconnection
          const retry = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', taskId)
            .select();
          
          data = retry.data;
          error = retry.error;
        }
      }
      
      if (error) {
        console.error('Supabase error updating task position:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Successfully updated task position:', data);
      return { success: true, data };
    } catch (err) {
      console.error('Error updating task position:', err);
      return { success: false, error: err.message };
    }
  };
  
  /**
   * Updates the positions of multiple sibling tasks with auto-reconnection
   * @param {Array} tasks - Array of tasks with updated position values
   * @returns {Promise<{success: boolean, error: string}>} - Success status and any error
   */
  const updateSiblingPositions = async (tasks) => {
    try {
      // If no tasks to update, return success
      if (!tasks || tasks.length === 0) {
        return { success: true };
      }
      
      console.log(`Updating positions for ${tasks.length} tasks`);
      
      // Create all update promises
      const updatePromises = tasks.map(task => {
        return supabase
          .from('tasks')
          .update({ position: task.position })
          .eq('id', task.id);
      });
      
      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);
      
      // Check if any updates failed due to connection issues
      const connectionErrors = results.filter(result => 
        result.error && isConnectionError(result.error)
      );
      
      // If there are connection errors, try to reconnect and retry those updates
      if (connectionErrors.length > 0) {
        console.log('Connection error detected, trying to reconnect...');
        const reconnected = await refreshConnection();
        
        if (reconnected) {
          // Retry just the failed updates after reconnection
          const failedTasks = [];
          results.forEach((result, index) => {
            if (result.error && isConnectionError(result.error)) {
              failedTasks.push(tasks[index]);
            }
          });
          
          if (failedTasks.length > 0) {
            console.log(`Retrying ${failedTasks.length} failed updates after reconnection`);
            
            const retryPromises = failedTasks.map(task => {
              return supabase
                .from('tasks')
                .update({ position: task.position })
                .eq('id', task.id);
            });
            
            const retryResults = await Promise.all(retryPromises);
            
            // Replace the original failed results with retry results
            let retryIndex = 0;
            for (let i = 0; i < results.length; i++) {
              if (results[i].error && isConnectionError(results[i].error)) {
                results[i] = retryResults[retryIndex++];
              }
            }
          }
        }
      }
      
      // Check if any updates still failed after retry
      const errors = results.filter(result => result.error).map(result => result.error);
      
      if (errors.length > 0) {
        console.error('Errors updating sibling positions:', errors);
        return { success: false, error: errors[0].message };
      }
      
      console.log('Successfully updated sibling positions');
      return { success: true };
    } catch (err) {
      console.error('Error updating sibling positions:', err);
      return { success: false, error: err.message };
    }
  };
  
  /**
   * Updates a task's completion status with auto-reconnection
   * @param {string} taskId - ID of the task to update
   * @param {boolean} currentStatus - Current completion status
   * @returns {Promise<{success: boolean, error: string}>} - Success status and any error
   */
  const updateTaskCompletion = async (taskId, currentStatus) => {
    try {
      // The newStatus should be the opposite of the currentStatus
      const newStatus = !currentStatus;
      
      console.log(`Updating task ${taskId} completion status to ${newStatus}`);
      
      // Try to update the task
      let { data, error } = await supabase
        .from('tasks')
        .update({ is_complete: newStatus })
        .eq('id', taskId)
        .select();
      
      // If there's a connection error, try to reconnect and retry
      if (error && isConnectionError(error)) {
        console.log('Connection error detected, trying to reconnect...');
        const reconnected = await refreshConnection();
        
        if (reconnected) {
          // Retry the operation after reconnection
          const retry = await supabase
            .from('tasks')
            .update({ is_complete: newStatus })
            .eq('id', taskId)
            .select();
          
          data = retry.data;
          error = retry.error;
        }
      }
      
      if (error) {
        console.error('Supabase error updating task completion:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Task completion updated successfully:', data);
      return { success: true, data };
    } catch (err) {
      console.error('Error updating task completion:', err);
      return { success: false, error: err.message };
    }
  };
  
  /**
   * Deletes a task and optionally its children with auto-reconnection
   * @param {string} taskId - The ID of the task to delete
   * @param {boolean} deleteChildren - Whether to also delete child tasks
   * @returns {Promise<{success: boolean, error: string, deletedIds: string[]}>} - The result
   */
  const deleteTask = async (taskId, deleteChildren = true) => {
    try {
      console.log('Deleting task with ID:', taskId);
      
      if (deleteChildren) {
        return await deleteTaskWithChildren(taskId);
      } else {
        // Just delete the single task
        let { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);
        
        // If there's a connection error, try to reconnect and retry
        if (error && isConnectionError(error)) {
          console.log('Connection error detected, trying to reconnect...');
          const reconnected = await refreshConnection();
          
          if (reconnected) {
            // Retry the operation after reconnection
            const retry = await supabase
              .from('tasks')
              .delete()
              .eq('id', taskId);
            
            error = retry.error;
          }
        }
        
        if (error) {
          console.error('Supabase error:', error);
          return { success: false, error: error.message || 'Failed to delete task in Supabase' };
        }
        
        console.log('Task deleted successfully');
        return { success: true, deletedIds: [taskId] };
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      return { success: false, error: err.message || 'Unknown error occurred' };
    }
  };
  
  /**
   * Deletes a task and all its children recursively with auto-reconnection
   * @param {string} taskId - The ID of the parent task to delete
   * @returns {Promise<{success: boolean, error: string, deletedIds: string[]}>} - The result
   */
  const deleteTaskWithChildren = async (taskId) => {
    try {
      // First, fetch all tasks to find children
      let { data: allTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id, parent_task_id');
      
      // If there's a connection error, try to reconnect and retry
      if (fetchError && isConnectionError(fetchError)) {
        console.log('Connection error detected, trying to reconnect...');
        const reconnected = await refreshConnection();
        
        if (reconnected) {
          // Retry the operation after reconnection
          const retry = await supabase
            .from('tasks')
            .select('id, parent_task_id');
          
          allTasks = retry.data;
          fetchError = retry.error;
        }
      }
      
      if (fetchError) {
        console.error('Error fetching tasks:', fetchError);
        return { success: false, error: fetchError.message || 'Failed to fetch tasks' };
      }
      
      // Helper function to recursively find all child task IDs
      const findAllChildren = (parentId, tasks) => {
        const children = tasks.filter(t => t.parent_task_id === parentId).map(t => t.id);
        let allChildren = [...children];
        
        for (const childId of children) {
          const grandchildren = findAllChildren(childId, tasks);
          allChildren = [...allChildren, ...grandchildren];
        }
        
        return allChildren;
      };
      
      // Get all child tasks (including the parent task)
      const childTaskIds = findAllChildren(taskId, allTasks);
      const allTasksToDelete = [taskId, ...childTaskIds];
      
      console.log(`Deleting task ${taskId} with ${childTaskIds.length} children`);
      
      // Delete all tasks in one operation
      let { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .in('id', allTasksToDelete);
      
      // If there's a connection error, try to reconnect and retry
      if (deleteError && isConnectionError(deleteError)) {
        console.log('Connection error detected, trying to reconnect...');
        const reconnected = await refreshConnection();
        
        if (reconnected) {
          // Retry the operation after reconnection
          const retry = await supabase
            .from('tasks')
            .delete()
            .in('id', allTasksToDelete);
          
          deleteError = retry.error;
        }
      }
      
      if (deleteError) {
        console.error('Error deleting tasks:', deleteError);
        return { success: false, error: deleteError.message || 'Failed to delete tasks' };
      }
      
      console.log('Tasks deleted successfully:', allTasksToDelete);
      return { success: true, deletedIds: allTasksToDelete };
    } catch (err) {
      console.error('Error deleting task with children:', err);
      return { success: false, error: err.message || 'Unknown error occurred' };
    }
  };
  
  // Return all the task service functions
  return {
    fetchAllTasks,
    createTask,
    updateTaskPosition,
    updateSiblingPositions,
    updateTaskCompletion,
    deleteTask,
    deleteTaskWithChildren
  };
};

// For compatibility with existing code, export direct functions as well
// These will work without the hooks but won't have auto-reconnection

/**
 * Fetches all tasks from Supabase, with optional filtering
 * @param {string} organizationId - Organization ID to filter tasks by
 * @param {string} userId - User ID to filter tasks by (for instance tasks)
 * @param {string} origin - Filter by task origin ("instance" or "template")
 * @returns {Promise<{data: Array, error: string}>} - The fetched task data or error
 */
export const fetchAllTasks = async (organizationId = null, userId = null, origin = null) => {
  try {
    // Start building the query
    let query = supabase.from('tasks').select('*');
    
    // Add filters if provided
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    }
    
    if (userId) {
      query = query.eq('creator', userId);
    }
    
    if (origin) {
      query = query.eq('origin', origin);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return { error: error.message || 'Failed to fetch tasks from Supabase' };
    }
    
    // Log the count of fetched tasks
    console.log(`Fetched ${data?.length || 0} tasks`);
    
    return { data };
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return { error: err.message || 'Unknown error occurred while fetching tasks' };
  }
};

/**
 * Creates a new task in Supabase
 * @param {Object} taskData - The task data to create
 * @returns {Promise<{data: Object, error: string}>} - The created task data or error
 */
export const createTask = async (taskData) => {
  try {
    console.log('Creating task with data:', JSON.stringify(taskData, null, 2));
    
    // Ensure required fields are present
    const requiredFields = ['title', 'origin'];
    const missingFields = requiredFields.filter(field => !taskData[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return { error: `Missing required fields: ${missingFields.join(', ')}` };
    }
    
    // Ensure parent_task_id is null if not provided (to avoid undefined)
    if (taskData.parent_task_id === undefined) {
      taskData.parent_task_id = null;
    }
    
    // Ensure due_date is in the correct format if provided
    if (taskData.due_date && !(taskData.due_date instanceof Date)) {
      try {
        taskData.due_date = new Date(taskData.due_date);
      } catch (e) {
        console.warn('Failed to parse due_date, setting to null', e);
        taskData.due_date = null;
      }
    }
    
    // Insert the task data into the 'tasks' table
    console.log('Sending request to Supabase...');
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return { error: error.message || 'Failed to create task in Supabase' };
    }
    
    console.log('Successfully created task:', data);
    
    // Supabase returns an array of inserted records, we want the first one
    return { data: data[0] };
  } catch (err) {
    console.error('Error creating task:', err);
    return { error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Updates a task's position in Supabase
 * @param {string} taskId - ID of the task to update
 * @param {string} parentId - New parent task ID
 * @param {number} position - New position value
 * @returns {Promise<{success: boolean, error: string}>} - Success status and any error
 */
export const updateTaskPosition = async (taskId, parentId, position) => {
  try {
    console.log(`Updating task position: taskId=${taskId}, parentId=${parentId}, position=${position}`);
    
    // Validate input
    if (!taskId) {
      return { success: false, error: 'Task ID is required' };
    }
    
    // Prepare the update data
    const updateData = {
      parent_task_id: parentId,
      position: position
    };
    
    // Update the task in Supabase
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select();
    
    if (error) {
      console.error('Supabase error updating task position:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Successfully updated task position:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error updating task position:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Updates the positions of multiple sibling tasks in a batch operation
 * @param {Array} tasks - Array of tasks with updated position values
 * @returns {Promise<{success: boolean, error: string}>} - Success status and any error
 */
export const updateSiblingPositions = async (tasks) => {
  try {
    // If no tasks to update, return success
    if (!tasks || tasks.length === 0) {
      return { success: true };
    }
    
    console.log(`Updating positions for ${tasks.length} tasks`);
    
    // Instead of using upsert, update each task individually
    const updatePromises = tasks.map(task => {
      return supabase
        .from('tasks')
        .update({ position: task.position })
        .eq('id', task.id);
    });
    
    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);
    
    // Check if any updates failed
    const errors = results.filter(result => result.error).map(result => result.error);
    
    if (errors.length > 0) {
      console.error('Errors updating sibling positions:', errors);
      return { success: false, error: errors[0].message };
    }
    
    console.log('Successfully updated sibling positions');
    return { success: true };
  } catch (err) {
    console.error('Error updating sibling positions:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Updates a task's completion status
 * @param {string} taskId - ID of the task to update
 * @param {boolean} currentStatus - Current completion status
 * @returns {Promise<{success: boolean, error: string}>} - Success status and any error
 */
export const updateTaskCompletion = async (taskId, currentStatus) => {
  try {
    // The newStatus should be the opposite of the currentStatus
    const newStatus = !currentStatus;
    
    console.log(`Updating task ${taskId} completion status to ${newStatus}`);
    
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_complete: newStatus })
      .eq('id', taskId)
      .select();
    
    if (error) {
      console.error('Supabase error updating task completion:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Task completion updated successfully:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error updating task completion:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Deletes a task and all its children from Supabase
 * @param {string} taskId - The ID of the task to delete
 * @param {boolean} deleteChildren - Whether to also delete child tasks
 * @returns {Promise<{success: boolean, error: string, deletedIds: string[]}>} - The result
 */
export const deleteTask = async (taskId, deleteChildren = true) => {
  try {
    console.log('Deleting task with ID:', taskId);
    
    if (deleteChildren) {
      return await deleteTaskWithChildren(taskId);
    } else {
      // Just delete the single task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) {
        console.error('Supabase error:', error);
        return { success: false, error: error.message || 'Failed to delete task in Supabase' };
      }
      
      console.log('Task deleted successfully');
      return { success: true, deletedIds: [taskId] };
    }
  } catch (err) {
    console.error('Error deleting task:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Deletes a task and all its children recursively from Supabase
 * @param {string} taskId - The ID of the parent task to delete
 * @returns {Promise<{success: boolean, error: string, deletedIds: string[]}>} - The result
 */
export const deleteTaskWithChildren = async (taskId) => {
  try {
    // First, fetch all tasks to find children
    const { data: allTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, parent_task_id');
    
    if (fetchError) {
      console.error('Error fetching tasks:', fetchError);
      return { success: false, error: fetchError.message || 'Failed to fetch tasks' };
    }
    
    // Helper function to recursively find all child task IDs
    const findAllChildren = (parentId, tasks) => {
      const children = tasks.filter(t => t.parent_task_id === parentId).map(t => t.id);
      let allChildren = [...children];
      
      for (const childId of children) {
        const grandchildren = findAllChildren(childId, tasks);
        allChildren = [...allChildren, ...grandchildren];
      }
      
      return allChildren;
    };
    
    // Get all child tasks (including the parent task)
    const childTaskIds = findAllChildren(taskId, allTasks);
    const allTasksToDelete = [taskId, ...childTaskIds];
    
    console.log(`Deleting task ${taskId} with ${childTaskIds.length} children`);
    
    // Delete all tasks in one operation
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .in('id', allTasksToDelete);
    
    if (deleteError) {
      console.error('Error deleting tasks:', deleteError);
      return { success: false, error: deleteError.message || 'Failed to delete tasks' };
    }
    
    console.log('Tasks deleted successfully:', allTasksToDelete);
    return { success: true, deletedIds: allTasksToDelete };
  } catch (err) {
    console.error('Error deleting task with children:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Update task date fields in the database
 * @param {string} taskId - The ID of the task to update
 * @param {Object} dateData - Object containing date fields to update (start_date, due_date, etc.)
 * @returns {Promise<{success: boolean, error: string|null, data: Object}>} Result of the update
 */
export const updateTaskDateFields = async (taskId, dateData) => {
  try {
    console.log('Updating task date fields:', { taskId, dateData });
    
    // Format dates for the database
    const formattedData = {};
    
    if (dateData.start_date !== undefined) {
      formattedData.start_date = dateData.start_date;
    }
    
    if (dateData.due_date !== undefined) {
      formattedData.due_date = dateData.due_date;
    }
    
    if (dateData.days_from_start_until_due !== undefined) {
      formattedData.days_from_start_until_due = dateData.days_from_start_until_due;
    }
    
    if (dateData.duration_days !== undefined) {
      formattedData.duration_days = dateData.duration_days;
    }
    
    // Only proceed if we have data to update
    if (Object.keys(formattedData).length === 0) {
      return { success: true, message: 'No date fields to update' };
    }
    
    // Update the task in Supabase
    const { data, error } = await supabase
      .from('tasks')
      .update(formattedData)
      .eq('id', taskId)
      .select();
    
    if (error) {
      console.error('Supabase error updating task dates:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('Error updating task date fields:', err);
    return { success: false, error: err.message };
  }
};
/**
 * Updates an existing task with new data
 * @param {string} taskId - The ID of the task to update
 * @param {Object} taskData - Object containing fields to update
 * @returns {Promise<{success: boolean, error: string|null, data: Object}>} Result of the update
 */
export const updateTask = async (taskId, taskData) => {
  try {
    console.log('Updating task:', { taskId, taskData });
    
    if (!taskId) {
      return { success: false, error: 'Task ID is required' };
    }
    
    // Extract only the updatable fields to avoid overwriting system fields
    const updatableFields = [
      'title', 
      'description', 
      'purpose', 
      'actions', 
      'resources',
      'task_lead',
      'marked_na',
      'is_complete',
      'published'
    ];
    
    // Create an object with only the fields we want to update
    const updateData = {};
    
    // Copy only valid fields from taskData to updateData
    updatableFields.forEach(field => {
      if (field in taskData) {
        updateData[field] = taskData[field];
      }
    });
    
    // Add a modified timestamp
    updateData.last_modified = new Date().toISOString();
    
    // Only proceed if we have data to update
    if (Object.keys(updateData).length === 0) {
      return { success: true, message: 'No fields to update' };
    }
    
    // Update the task in Supabase
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select();
    
    if (error) {
      console.error('Supabase error updating task:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Task updated successfully:', data);
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('Error updating task:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Updates a task with both content and date fields
 * @param {string} taskId - The ID of the task to update
 * @param {Object} taskData - Complete task data to update
 * @returns {Promise<{success: boolean, error: string|null, data: Object}>} Result of the update
 */
export const updateTaskComplete = async (taskId, taskData) => {
  try {
    console.log('Performing complete task update:', { taskId });
    
    // Process array fields first - before any updates
    const processedTaskData = processArrayFields(taskData);
    console.log('Processed task data:', processedTaskData);
    
    // First, update date-specific fields
    const dateFields = {
      start_date: processedTaskData.start_date,
      due_date: processedTaskData.due_date,
      days_from_start_until_due: processedTaskData.days_from_start_until_due,
      duration_days: processedTaskData.duration_days
    };
    
    const dateResult = await updateTaskDateFields(taskId, dateFields);
    
    if (!dateResult.success) {
      console.error('Error updating task date fields:', dateResult.error);
      return dateResult;
    }
    
    // Then update the remaining content fields
    const contentResult = await updateTask(taskId, processedTaskData);
    
    if (!contentResult.success) {
      console.error('Error updating task content:', contentResult.error);
      return contentResult;
    }
    
    // Merge the updated data
    const updatedData = {
      ...dateResult.data,
      ...contentResult.data
    };
    
    return { success: true, data: updatedData };
  } catch (err) {
    console.error('Error performing complete task update:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Ensures that array fields are properly formatted for the database
 * @param {Object} taskData - Task data to process
 * @returns {Object} - Processed task data with properly formatted arrays
 */
const processArrayFields = (taskData) => {
  const result = { ...taskData };
  
  // Helper function to process a specific field
  const processField = (fieldName) => {
    if (fieldName in result) {
      const value = result[fieldName];
      
      // Ensure field is an array
      if (!Array.isArray(value)) {
        if (typeof value === 'string') {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(value);
            result[fieldName] = Array.isArray(parsed) ? parsed : [value];
          } catch (e) {
            // If parsing fails, treat it as a single item array
            result[fieldName] = [value];
          }
        } else if (value === null || value === undefined) {
          // Handle null/undefined values
          result[fieldName] = [];
        } else {
          // For any other value, wrap it in an array
          result[fieldName] = [value];
        }
      }
      
      // Filter out empty strings if it's an array
      if (Array.isArray(result[fieldName])) {
        result[fieldName] = result[fieldName].filter(item => item !== '');
      }
    }
  };
  
  // Process actions and resources fields
  processField('actions');
  processField('resources');
  
  return result;
};

