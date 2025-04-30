import { supabase } from '../supabaseClient';

/**
 * Fetches all tasks from Supabase, with optional filtering
 * @param {string} organizationId - Organization ID to filter tasks by
 * @param {string} userId - User ID to filter tasks by (for instance tasks)
 * @param {string} origin - Filter by task origin ("instance" or "template")
 * @returns {Promise<{data: Array, error: string}>} - The fetched task data or error
 */
export const fetchAllTasks = async (organizationId = null, userId = null, origin = null) => {
  try {
    console.log('Fetching tasks with params:', { organizationId, userId, origin });
    
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