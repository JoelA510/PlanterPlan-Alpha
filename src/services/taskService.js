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

// Add this function to your existing taskService.js file

/**
 * Creates a new task
 * @param {Object} taskData - The task data to create
 * @returns {Promise<{data: Object, error: string}>} - The created task data or error
 */
export const createTask = async (taskData) => {
  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { error: data.message || 'Failed to create task' };
    }
    
    return { data };
  } catch (err) {
    console.error('Error creating task:', err);
    return { error: err.message };
  }
};