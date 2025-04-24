import { supabase } from '../supabaseClient';

/**
 * Fetches tasks with filtering by organization, user, and/or task origin
 * @param {string|null} organizationId - Optional organization ID to filter by
 * @param {string|null} userId - Optional user ID to filter by creator (for instance tasks)
 * @param {string|null} origin - Optional task origin to filter by ('instance' or 'template')
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export const fetchAllTasks = async (organizationId = null, userId = null, origin = null) => {
  try {
    console.log('fetchAllTasks called with:', { organizationId, userId, origin });
    
    // Start building the query
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        purpose,
        type,
        origin,
        published,
        creator,
        created_at,
        last_modified,
        parent_task_id,
        position,
        is_complete,
        due_date,
        task_lead,
        white_label_id,
        actions,
        resources
      `);
    
    // Apply organization filter if provided
    if (organizationId) {
      console.log('Filtering by organization:', organizationId);
      query = query.eq('white_label_id', organizationId);
    } else {
      console.log('No organization ID, fetching tasks with null white_label_id');
      query = query.is('white_label_id', null);
    }
    
    // Apply task origin filter if provided
    if (origin) {
      console.log('Filtering by origin:', origin);
      query = query.eq('origin', origin);
    }
    
    // Apply user filter only for instance tasks or when origin is not specified
    if (userId && (origin === 'instance' || !origin)) {
      console.log('Filtering by creator (user ID):', userId);
      query = query.eq('creator', userId);
    }
    
    // Add ordering
    query = query.order('position', { ascending: true });
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return { data: null, error: err.message };
  }
};

export const updateTaskCompletion = async (taskId, currentStatus, organizationId = null) => {
  try {
    let query = supabase
      .from('tasks')
      .update({ is_complete: !currentStatus })
      .eq('id', taskId);
    
    // Add organization check for safety if provided
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    }
    
    const { error } = await query;
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating task completion:', err);
    return { success: false, error: err.message };
  }
};

export const updateTaskPosition = async (taskId, newParentId, newPosition, organizationId = null) => {
  try {
    let query = supabase
      .from('tasks')
      .update({
        parent_task_id: newParentId,
        position: newPosition
      })
      .eq('id', taskId);
    
    // Add organization check for safety if provided
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    }
    
    const { error } = await query;
      
    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating task position:', err);
    return { success: false, error: err.message };
  }
};

export const updateSiblingPositions = async (tasks, organizationId = null) => {
  for (const task of tasks) {
    try {
      let query = supabase
        .from('tasks')
        .update({ position: task.position })
        .eq('id', task.id);
      
      // Add organization check for safety if provided
      if (organizationId) {
        query = query.eq('white_label_id', organizationId);
      }
      
      const { error } = await query;
        
      if (error) throw error;
    } catch (err) {
      console.error(`Error updating position for task ${task.id}:`, err);
      return { success: false, error: err.message };
    }
  }
  
  return { success: true, error: null };
};

/**
 * Creates a new task in Supabase with license support
 * @param {Object} taskData - The task data to create
 * @param {string} licenseId - Optional license ID to associate with the task
 * @returns {Promise<{data: Object, error: string}>} - The created task data or error
 */
export const createTask = async (taskData, licenseId = null) => {
  try {
    console.log('Creating task with data:', JSON.stringify(taskData, null, 2));
    
    // Ensure required fields are present
    const requiredFields = ['title', 'origin'];
    const missingFields = requiredFields.filter(field => !taskData[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return { error: `Missing required fields: ${missingFields.join(', ')}` };
    }
    
    // If this is a top-level task (project) with no parent, check if it needs a license
    if (!taskData.parent_task_id) {
      // Handle license for top-level task
      const taskWithLicense = {
        ...taskData,
        license_id: licenseId
      };
      
      // Insert the task data into the 'tasks' table
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskWithLicense])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        return { error: error.message || 'Failed to create task in Supabase' };
      }
      
      // Supabase returns an array of inserted records, we want the first one
      return { data: data[0] };
    } else {
      // Child tasks inherit the license ID from their parent
      // First, fetch the parent task to get its license_id
      const { data: parentTask, error: parentError } = await supabase
        .from('tasks')
        .select('license_id')
        .eq('id', taskData.parent_task_id)
        .single();
      
      if (parentError) {
        console.error('Error fetching parent task:', parentError);
        return { error: parentError.message || 'Failed to fetch parent task' };
      }
      
      // Create the child task with the parent's license_id
      const taskWithLicense = {
        ...taskData,
        license_id: parentTask.license_id
      };
      
      // Insert the task data into the 'tasks' table
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskWithLicense])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        return { error: error.message || 'Failed to create task in Supabase' };
      }
      
      // Supabase returns an array of inserted records, we want the first one
      return { data: data[0] };
    }
  } catch (err) {
    console.error('Error creating task:', err);
    return { error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Deletes a task and all its child tasks from Supabase
 * @param {string|number} taskId - The ID of the task to delete
 * @param {string|null} organizationId - The organization ID for verification
 * @returns {Promise<{success: boolean, error: string|null}>} - Result of the operation
 */
export const deleteTask = async (taskId, organizationId = null) => {
  try {
    console.log(`Deleting task with ID: ${taskId}`);
    
    // First, we need to fetch all children of this task recursively
    const allTaskIds = await getAllChildTaskIds(taskId, organizationId);
    allTaskIds.push(taskId); // Add the parent task ID
    
    console.log(`Will delete the following task IDs: ${allTaskIds.join(', ')}`);
    
    // Delete all the tasks in a single operation
    let query = supabase
      .from('tasks')
      .delete()
      .in('id', allTaskIds);
    
    // Add organization check for safety if provided
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return { success: false, error: error.message || 'Failed to delete task in Supabase' };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('Error deleting task:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Helper function to recursively get all child task IDs
 * @param {string|number} parentId - The parent task ID
 * @param {string|null} organizationId - The organization ID for filtering
 * @returns {Promise<Array>} - Array of child task IDs
 */
const getAllChildTaskIds = async (parentId, organizationId = null) => {
  try {
    // Create query for direct children
    let query = supabase
      .from('tasks')
      .select('id')
      .eq('parent_task_id', parentId);
    
    // Add organization check if provided
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching child tasks:', error);
      return [];
    }
    
    // Extract the IDs
    const childIds = data.map(task => task.id);
    
    // For each child, recursively get its children
    const grandchildPromises = childIds.map(childId => 
      getAllChildTaskIds(childId, organizationId)
    );
    const grandchildResults = await Promise.all(grandchildPromises);
    
    // Flatten the results and combine with the direct children
    const allDescendantIds = [...childIds, ...grandchildResults.flat()];
    
    return allDescendantIds;
  } catch (err) {
    console.error('Error in getAllChildTaskIds:', err);
    return [];
  }
};