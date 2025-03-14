import { supabase } from '../supabaseClient';

export const fetchAllTasks = async () => {
  try {
    const { data, error } = await supabase
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
        task_lead
      `)
      .order('position', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return { data: null, error: err.message };
  }
};

export const updateTaskCompletion = async (taskId, currentStatus) => {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ is_complete: !currentStatus })
      .eq('id', taskId);
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating task completion:', err);
    return { success: false, error: err.message };
  }
};

export const updateTaskPosition = async (taskId, newParentId, newPosition) => {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        parent_task_id: newParentId,
        position: newPosition
      })
      .eq('id', taskId);
      
    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating task position:', err);
    return { success: false, error: err.message };
  }
};

export const updateSiblingPositions = async (tasks) => {
  for (const task of tasks) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ position: task.position })
        .eq('id', task.id);
        
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
 * @returns {Promise<{data: Object, error: string}>} - The created task data or error
 */
export const createTask = async (taskData) => {
  try {
    console.log('Creating task with data:', taskData);
    
    // Insert the task data into the 'tasks' table
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
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
 * @returns {Promise<{data: Object, error: string}>} - The created task data or error
 */
export const mockCreateTask = async (taskData) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate a random ID
  const id = Math.floor(Math.random() * 10000);
  
  // Return mock data
  return {
    data: {
      ...taskData,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };
};