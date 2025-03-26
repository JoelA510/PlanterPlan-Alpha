import { supabase } from '../supabaseClient';

export const fetchAllTasks = async (organizationId = null) => {
  try {
    // Create query builder
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
        white_label_id
      `)
      .order('position', { ascending: true });
    
    // If organization ID is provided, filter by it
    if (organizationId) {
      console.log(organizationId);
      query = query.eq('white_label_id', organizationId);
    }
   
    const { data, error } = await query;
    console.log(query);
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
 * Creates a new task in Supabase
 * @param {Object} taskData - The task data to create
 * @param {string|null} organizationId - The organization ID to associate this task with
 * @returns {Promise<{data: Object, error: string}>} - The created task data or error
 */
export const createTask = async (taskData, organizationId = null) => {
  try {
    // Add organization ID to task data if provided
    const taskWithOrg = organizationId 
      ? { ...taskData, white_label_id: organizationId }
      : taskData;
    
    console.log('Creating task with data:', taskWithOrg);
    
    // Insert the task data into the 'tasks' table
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskWithOrg])
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return { error: error.message || 'Failed to create task in Supabase' };
    }
    
    // Supabase returns an array of inserted records, we want the first one
    return { data: data[0] };
  } catch (err) {
    console.error('Error creating task:', err);
    return { error: err.message || 'Unknown error occurred' };
  }
};

// For development/testing purposes, you might want to add a mock implementation
// that doesn't require a connection to Supabase

/**
 * Mock implementation of createTask for development/testing
 * @param {Object} taskData - The task data to create
 * @param {string|null} organizationId - The organization ID to associate this task with
 * @returns {Promise<{data: Object, error: string}>} - The created task data or error
 */
// export const mockCreateTask = async (taskData, organizationId = null) => {
//   // Simulate API delay
//   await new Promise(resolve => setTimeout(resolve, 500));
  
//   // Generate a random ID
//   const id = Math.floor(Math.random() * 10000);
  
//   // Add organization ID if provided
//   const taskWithOrg = organizationId 
//     ? { ...taskData, organization_id: organizationId }
//     : taskData;
  
//   // Return mock data
//   return {
//     data: {
//       ...taskWithOrg,
//       id,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString()
//     }
//   };
// };

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