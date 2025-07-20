// src/services/taskService.js - Enhanced version with project-specific fetching
import { supabase } from '../supabaseClient';

/**
 * Fetch all tasks with enhanced filtering options
 * @param {string|null} organizationId - Organization ID (can be null)
 * @param {string|null} userId - User ID for ownership filtering (can be null)
 * @param {string} origin - Task origin ('instance' or 'template')
 * @param {string|null} projectId - Specific project ID to fetch tasks for (NEW)
 * @param {Object} options - Additional options
 * @returns {Promise<{data: Array, error: string}>}
 */
export const fetchAllTasks = async (organizationId = null, userId = null, origin = 'instance', projectId = null, options = {}) => {
  try {
    console.log('fetchAllTasks called with:', { organizationId, userId, origin, projectId, options });
    
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('origin', origin);

    // ✅ NEW: If projectId is specified, fetch that specific project and its tasks
    if (projectId) {
      console.log('Fetching tasks for specific project:', projectId);
      
      // Get the project and all its descendants
      query = query.or(`id.eq.${projectId},parent_task_id.eq.${projectId}`);
      
      // We might need to recursively get all descendants
      // For now, let's get direct children and let the UI handle expansion
      
    } else {
      // Existing logic for fetching user's owned tasks
      if (origin === 'instance') {
        if (userId) {
          query = query.eq('creator', userId);
        } else {
          console.warn('No userId provided for instance tasks');
          return { data: [], error: null };
        }
      }
    }

    // Apply organization filter if provided
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    } else {
      query = query.is('white_label_id', null);
    }

    // Add ordering
    query = query.order('position', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return { data: null, error: error.message };
    }

    // ✅ NEW: If fetching for a specific project, we might need to get all descendants
    if (projectId && data && data.length > 0) {
      const allTasks = await fetchAllDescendants(data, organizationId);
      console.log(`Fetched ${allTasks.length} total tasks for project ${projectId}`);
      return { data: allTasks, error: null };
    }

    console.log(`Fetched ${data?.length || 0} tasks`);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error in fetchAllTasks:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Recursively fetch all descendants of a set of tasks
 * @param {Array} parentTasks - Array of parent tasks
 * @param {string|null} organizationId - Organization ID
 * @returns {Promise<Array>} - All tasks including descendants
 */
const fetchAllDescendants = async (parentTasks, organizationId = null) => {
  try {
    // Use a Map to track all task IDs to prevent duplicates
    const allTasksMap = new Map();
    
    // Add parent tasks to the map
    parentTasks.forEach(task => {
      allTasksMap.set(task.id, task);
    });
    
    const parentIds = parentTasks.map(task => task.id);
    
    if (parentIds.length === 0) {
      return Array.from(allTasksMap.values());
    }

    // Build query for children using 'in' operator for better performance
    let query = supabase
      .from('tasks')
      .select('*')
      .in('parent_task_id', parentIds);

    // Apply organization filter
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    } else {
      query = query.is('white_label_id', null);
    }

    query = query.order('position', { ascending: true });

    const { data: children, error } = await query;

    if (error) {
      console.error('Error fetching descendants:', error);
      return Array.from(allTasksMap.values());
    }

    if (children && children.length > 0) {
      // Add children to the map (this automatically handles duplicates)
      children.forEach(child => {
        allTasksMap.set(child.id, child);
      });
      
      // Recursively fetch their children
      const grandChildren = await fetchAllDescendants(children, organizationId);
      
      // Add grandchildren to the map
      grandChildren.forEach(grandChild => {
        allTasksMap.set(grandChild.id, grandChild);
      });
    }

    return Array.from(allTasksMap.values());
  } catch (err) {
    console.error('Error fetching descendants:', err);
    return parentTasks;
  }
};

/**
 * ✅ NEW: Fetch tasks for multiple projects efficiently
 * @param {Array} projectIds - Array of project IDs
 * @param {string|null} organizationId - Organization ID
 * @returns {Promise<{data: Array, error: string}>}
 */
export const fetchTasksForProjects = async (projectIds, organizationId = null) => {
  try {
    console.log('fetchTasksForProjects called with:', { projectIds, organizationId });
    
    if (!projectIds || projectIds.length === 0) {
      return { data: [], error: null };
    }

    // Fetch all tasks that belong to any of the specified projects
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('origin', 'instance');

    // Create OR condition for project IDs and their descendants
    const orConditions = projectIds.map(id => `id.eq.${id}`).join(',');
    query = query.or(orConditions);

    // Apply organization filter
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    } else {
      query = query.is('white_label_id', null);
    }

    query = query.order('position', { ascending: true });

    const { data: rootTasks, error } = await query;

    if (error) {
      console.error('Error fetching project tasks:', error);
      return { data: null, error: error.message };
    }

    // Get all descendants for each project
    const allTasks = await fetchAllDescendants(rootTasks || [], organizationId);
    
    console.log(`Fetched ${allTasks.length} total tasks for ${projectIds.length} projects`);
    return { data: allTasks, error: null };
  } catch (err) {
    console.error('Error in fetchTasksForProjects:', err);
    return { data: null, error: err.message };
  }
};

// ... (rest of the existing functions remain the same)

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @returns {Promise<{data: Object, error: string}>}
 */
export const createTask = async (taskData) => {
  try {
    console.log('Creating task:', taskData);
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return { data: null, error: error.message };
    }

    console.log('Task created successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Error in createTask:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Update task completion status
 * @param {string} taskId - Task ID
 * @param {boolean} currentStatus - Current completion status
 * @returns {Promise<{success: boolean, error: string}>}
 */
export const updateTaskCompletion = async (taskId, currentStatus) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ 
        is_complete: !currentStatus,
        last_modified: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task completion:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, error: null };
  } catch (err) {
    console.error('Error in updateTaskCompletion:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Update task position for drag and drop
 * @param {string} taskId - Task ID
 * @param {string|null} parentId - New parent task ID
 * @param {number} position - New position
 * @returns {Promise<{success: boolean, error: string}>}
 */
export const updateTaskPosition = async (taskId, parentId, position) => {
  try {
    console.log('Updating task position:', { taskId, parentId, position });

    const updateData = {
      parent_task_id: parentId,
      position: position,
      last_modified: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task position:', error);
      return { success: false, error: error.message };
    }

    console.log('Task position updated successfully:', data);
    return { success: true, data, error: null };
  } catch (err) {
    console.error('Error in updateTaskPosition:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Delete a task and optionally its children
 * @param {string} taskId - Task ID
 * @param {boolean} deleteChildren - Whether to delete children
 * @returns {Promise<{success: boolean, error: string, deletedIds: Array}>}
 */
export const deleteTask = async (taskId, deleteChildren = true) => {
  try {
    console.log('Deleting task:', taskId, 'deleteChildren:', deleteChildren);
    
    let deletedIds = [taskId];
    
    if (deleteChildren) {
      // First, find all descendants
      const descendants = await findAllDescendants(taskId);
      deletedIds = [taskId, ...descendants.map(d => d.id)];
    }
    
    // Delete in reverse order (children first, then parents)
    for (let i = deletedIds.length - 1; i >= 0; i--) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', deletedIds[i]);
        
      if (error) {
        console.error(`Error deleting task ${deletedIds[i]}:`, error);
        return { success: false, error: error.message, deletedIds: [] };
      }
    }
    
    console.log('Tasks deleted successfully:', deletedIds);
    return { success: true, deletedIds, error: null };
  } catch (err) {
    console.error('Error in deleteTask:', err);
    return { success: false, error: err.message, deletedIds: [] };
  }
};

/**
 * Find all descendants of a task
 * @param {string} taskId - Parent task ID
 * @returns {Promise<Array>} - Array of descendant tasks
 */
const findAllDescendants = async (taskId) => {
  try {
    const { data: children, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', taskId);
      
    if (error) {
      console.error('Error finding descendants:', error);
      return [];
    }
    
    if (!children || children.length === 0) {
      return [];
    }
    
    // Recursively find descendants of children
    const allDescendants = [...children];
    for (const child of children) {
      const grandChildren = await findAllDescendants(child.id);
      allDescendants.push(...grandChildren);
    }
    
    return allDescendants;
  } catch (err) {
    console.error('Error in findAllDescendants:', err);
    return [];
  }
};

/**
 * Update complete task data
 * @param {string} taskId - Task ID
 * @param {Object} updateData - Updated task data
 * @returns {Promise<{success: boolean, error: string, data: Object}>}
 */
export const updateTaskComplete = async (taskId, updateData) => {
  try {
    console.log('Updating complete task:', taskId, updateData);
    
    const dataWithTimestamp = {
      ...updateData,
      last_modified: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .update(dataWithTimestamp)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('Task updated successfully:', data);
    return { success: true, data, error: null };
  } catch (err) {
    console.error('Error in updateTaskComplete:', err);
    return { success: false, error: err.message, data: null };
  }
};

/**
 * ✅ NEW: Get task with its project membership info
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID to check permissions for
 * @returns {Promise<{data: Object, error: string}>}
 */
export const getTaskWithPermissions = async (taskId, userId) => {
  try {
    console.log('Getting task with permissions:', { taskId, userId });
    
    // Get the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (taskError) {
      return { data: null, error: taskError.message };
    }
    
    // Find the root project for this task
    let rootProject = task;
    if (task.parent_task_id) {
      const { data: rootData, error: rootError } = await findRootProject(taskId);
      if (!rootError && rootData) {
        rootProject = rootData;
      }
    }
    
    // Check user's membership in the project
    const { data: membership, error: memberError } = await supabase
      .from('project_memberships')
      .select('role, status')
      .eq('project_id', rootProject.id)
      .eq('user_id', userId)
      .single();
    
    // Add permission info to task
    const taskWithPermissions = {
      ...task,
      userRole: membership?.role || null,
      userStatus: membership?.status || null,
      canEdit: membership?.status === 'accepted' && ['owner', 'full_user'].includes(membership.role),
      canDelete: membership?.status === 'accepted' && membership.role === 'owner',
      canManageTeam: membership?.status === 'accepted' && membership.role === 'owner',
      isOwner: task.creator === userId,
      isMember: !!membership
    };
    
    return { data: taskWithPermissions, error: null };
  } catch (err) {
    console.error('Error in getTaskWithPermissions:', err);
    return { data: null, error: err.message };
  }
};

/**
 * ✅ NEW: Find the root project for a given task
 * @param {string} taskId - Task ID
 * @returns {Promise<{data: Object, error: string}>}
 */
const findRootProject = async (taskId) => {
  try {
    let currentTask = await supabase
      .from('tasks')
      .select('id, parent_task_id')
      .eq('id', taskId)
      .single();
      
    if (currentTask.error) {
      return { data: null, error: currentTask.error.message };
    }
    
    // Walk up the hierarchy until we find the root
    while (currentTask.data.parent_task_id) {
      const { data: parentTask, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', currentTask.data.parent_task_id)
        .single();
        
      if (error) {
        return { data: null, error: error.message };
      }
      
      currentTask.data = parentTask;
    }
    
    return { data: currentTask.data, error: null };
  } catch (err) {
    console.error('Error finding root project:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Update task date fields specifically
 * @param {string} taskId - Task ID
 * @param {Object} dateData - Date fields to update
 * @returns {Promise<{success: boolean, error: string, data: Object}>}
 */
export const updateTaskDateFields = async (taskId, dateData) => {
  try {
    console.log('Updating task date fields:', taskId, dateData);
    
    const updateData = {
      ...dateData,
      last_modified: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task date fields:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('Task date fields updated successfully:', data);
    return { success: true, data, error: null };
  } catch (err) {
    console.error('Error in updateTaskDateFields:', err);
    return { success: false, error: err.message, data: null };
  }
};

/**
 * Update specific task fields
 * @param {string} taskId - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, error: string, data: Object}>}
 */
export const updateTaskFields = async (taskId, updates) => {
  try {
    console.log('Updating task fields:', taskId, updates);
    
    const updateData = {
      ...updates,
      last_modified: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task fields:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('Task fields updated successfully:', data);
    return { success: true, data, error: null };
  } catch (err) {
    console.error('Error in updateTaskFields:', err);
    return { success: false, error: err.message, data: null };
  }
};

/**
 * Get a single task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<{data: Object, error: string}>}
 */
export const getTaskById = async (taskId) => {
  try {
    console.log('Fetching task by ID:', taskId);
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('Error fetching task:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error in getTaskById:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Get tasks by parent ID
 * @param {string} parentId - Parent task ID
 * @param {string|null} organizationId - Organization ID
 * @returns {Promise<{data: Array, error: string}>}
 */
export const getTasksByParent = async (parentId, organizationId = null) => {
  try {
    console.log('Fetching tasks by parent:', parentId);
    
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', parentId)
      .order('position', { ascending: true });

    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    } else {
      query = query.is('white_label_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks by parent:', error);
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error in getTasksByParent:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Update task hierarchy (parent/position)
 * @param {string} taskId - Task ID
 * @param {string|null} newParentId - New parent task ID
 * @param {number} newPosition - New position
 * @returns {Promise<{success: boolean, error: string, data: Object}>}
 */
export const updateTaskHierarchy = async (taskId, newParentId, newPosition) => {
  try {
    console.log('Updating task hierarchy:', { taskId, newParentId, newPosition });

    const updateData = {
      parent_task_id: newParentId,
      position: newPosition,
      last_modified: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task hierarchy:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('Task hierarchy updated successfully:', data);
    return { success: true, data, error: null };
  } catch (err) {
    console.error('Error in updateTaskHierarchy:', err);
    return { success: false, error: err.message, data: null };
  }
};

/**
 * Batch update multiple tasks
 * @param {Array} taskUpdates - Array of {id, ...updateData} objects
 * @returns {Promise<{success: boolean, error: string, data: Array}>}
 */
export const batchUpdateTasks = async (taskUpdates) => {
  try {
    console.log('Batch updating tasks:', taskUpdates.length, 'tasks');
    
    const timestamp = new Date().toISOString();
    const updatesWithTimestamp = taskUpdates.map(update => ({
      ...update,
      last_modified: timestamp
    }));

    const { data, error } = await supabase
      .from('tasks')
      .upsert(updatesWithTimestamp)
      .select();

    if (error) {
      console.error('Error batch updating tasks:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('Tasks batch updated successfully:', data?.length || 0, 'tasks');
    return { success: true, data: data || [], error: null };
  } catch (err) {
    console.error('Error in batchUpdateTasks:', err);
    return { success: false, error: err.message, data: null };
  }
};

/**
 * Get task statistics for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<{data: Object, error: string}>}
 */
export const getTaskStatistics = async (projectId) => {
  try {
    console.log('Fetching task statistics for project:', projectId);
    
    // Get all tasks for the project
    const { data: allTasks, error } = await fetchAllTasks(null, null, 'instance', projectId);
    
    if (error) {
      return { data: null, error };
    }

    const stats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.is_complete).length,
      pending: allTasks.filter(t => !t.is_complete).length,
      overdue: 0, // Would need date calculation
      dueToday: 0, // Would need date calculation
      topLevel: allTasks.filter(t => !t.parent_task_id).length,
      subTasks: allTasks.filter(t => t.parent_task_id).length
    };

    stats.completionRate = stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : 0;

    return { data: stats, error: null };
  } catch (err) {
    console.error('Error in getTaskStatistics:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Add a task to the master library
 * @param {string} taskId - Task ID to add to master library
 * @param {string} userId - User ID who is adding the task
 * @param {string|null} organizationId - Organization ID (can be null)
 * @returns {Promise<{success: boolean, error: string, data: Object}>}
 */
export const addToMasterLibrary = async (taskId, userId, organizationId = null) => {
  try {
    console.log('Adding task to master library:', { taskId, userId, organizationId });
    
    // First, verify the task exists and is a template
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('origin', 'template')
      .single();
    
    if (taskError) {
      console.error('Error fetching task:', taskError);
      return { success: false, error: 'Task not found or not a template', data: null };
    }
    
    if (!task) {
      return { success: false, error: 'Task not found or not a template', data: null };
    }
    
    // Check if already in master library
    const { data: existing, error: existingError } = await supabase
      .from('master_library_tasks')
      .select('id')
      .eq('task_id', taskId)
      .eq('white_label_id', organizationId)
      .single();
    
    if (existing) {
      return { success: false, error: 'Task already exists in master library', data: null };
    }
    
    // Add to master library
    const libraryData = {
      task_id: taskId,
      added_by: userId,
      white_label_id: organizationId,
      added_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('master_library_tasks')
      .insert([libraryData])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding to master library:', error);
      return { success: false, error: error.message, data: null };
    }
    
    console.log('Task added to master library successfully:', data);
    return { success: true, data, error: null };
  } catch (err) {
    console.error('Error in addToMasterLibrary:', err);
    return { success: false, error: err.message, data: null };
  }
};

/**
 * Remove a task from the master library
 * @param {string} taskId - Task ID to remove from master library
 * @param {string} userId - User ID who is removing the task
 * @param {string|null} organizationId - Organization ID (can be null)
 * @returns {Promise<{success: boolean, error: string, data: Object}>}
 */
export const removeFromMasterLibrary = async (taskId, userId, organizationId = null) => {
  try {
    console.log('Removing task from master library:', { taskId, userId, organizationId });
    
    // Check if the entry exists first
    const { data: existing, error: existingError } = await supabase
      .from('master_library_tasks')  // ✅ FIXED: Ensure correct table name
      .select('*')
      .eq('task_id', taskId)
      .eq('white_label_id', organizationId)
      .single();
    
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing entry:', existingError);
      return { success: false, error: existingError.message, data: null };
    }
    
    if (!existing) {
      console.warn('Task not found in master library:', taskId);
      return { success: false, error: 'Task not found in master library', data: null };
    }
    
    console.log('Found existing entry:', existing);
    
    // Remove from master library using the ID of the master_library_tasks entry
    const { data, error } = await supabase
      .from('master_library_tasks')  // ✅ FIXED: Ensure correct table name
      .delete()
      .eq('id', existing.id)  // ✅ FIXED: Use the master library entry ID, not task_id
      .select()
      .single();
    
    if (error) {
      console.error('Error removing from master library:', error);
      return { success: false, error: error.message, data: null };
    }
    
    console.log('Task removed from master library successfully:', data);
    return { success: true, data, error: null };
  } catch (err) {
    console.error('Error in removeFromMasterLibrary:', err);
    return { success: false, error: err.message, data: null };
  }
};

/**
 * Check if a task is in the master library
 * @param {string} taskId - Task ID to check
 * @param {string|null} organizationId - Organization ID (can be null)
 * @returns {Promise<{isInLibrary: boolean, error: string, data: Object}>}
 */
export const checkIfInMasterLibrary = async (taskId, organizationId = null) => {
  try {
    console.log('Checking if task is in master library:', { taskId, organizationId });
    
    const { data, error } = await supabase
      .from('master_library_tasks')
      .select('*')
      .eq('task_id', taskId)
      .eq('whitelabel_id', organizationId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking master library:', error);
      return { isInLibrary: false, error: error.message, data: null };
    }
    
    const isInLibrary = !!data;
    console.log('Task in master library:', isInLibrary);
    return { isInLibrary, data, error: null };
  } catch (err) {
    console.error('Error in checkIfInMasterLibrary:', err);
    return { isInLibrary: false, error: err.message, data: null };
  }
};

/**
 * Get all tasks from the master library
 * @param {string|null} organizationId - Organization ID (can be null)
 * @param {Object} options - Additional options
 * @param {boolean} options.includeTaskDetails - Whether to include full task details
 * @returns {Promise<{data: Array, error: string}>}
 */
export const getMasterLibraryTasks = async (organizationId = null, options = {}) => {
  try {
    console.log('Fetching master library tasks:', { organizationId, options });
    
    const { includeTaskDetails = true } = options;
    
    let query = supabase
      .from('master_library_tasks')
      .select(includeTaskDetails ? 
        `
          *,
          task:tasks(*)
        ` : 
        '*'
      )
      .eq('white_label_id', organizationId)
      .order('added_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching master library tasks:', error);
      return { data: null, error: error.message };
    }
    
    console.log(`Fetched ${data?.length || 0} master library tasks`);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error in getMasterLibraryTasks:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Search master library tasks by title and other fields
 * @param {string} searchTerm - Search term for task titles, descriptions, etc.
 * @param {string|null} organizationId - Organization ID (can be null)
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of results (default: 50)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @param {boolean} options.includeTaskDetails - Whether to include full task details (default: true)
 * @returns {Promise<{data: Array, error: string, totalCount: number}>}
 */
export const searchMasterLibraryTasks = async (searchTerm, organizationId = null, options = {}) => {
  try {
    console.log('Searching master library tasks:', { searchTerm, organizationId, options });
    
    const { 
      limit = 50, 
      offset = 0, 
      includeTaskDetails = true 
    } = options;
    
    // If no search term, return empty results
    if (!searchTerm || searchTerm.trim().length === 0) {
      return { data: [], error: null, totalCount: 0 };
    }
    
    const trimmedSearch = searchTerm.trim();
    
    // Try to use the master_library_view first, fall back to manual join
    let query;
    let useView = true;
    
    try {
      // First attempt: Use the view if it exists
      query = supabase
        .from('master_library_view')
        .select('*', { count: 'exact' });
    } catch (viewError) {
      console.log('View not available, using manual join');
      useView = false;
      
      // Fallback: Manual join of master_library_tasks with tasks
      query = supabase
        .from('master_library_tasks')
        .select(includeTaskDetails ? 
          `
            *,
            task:tasks(*)
          ` : 
          '*',
          { count: 'exact' }
        );
    }
    
    // Apply organization filter
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    } else {
      query = query.is('white_label_id', null);
    }
    
    // Apply search filters based on whether we're using view or manual join
    if (useView) {
      // If using view, search directly on title and description columns
      query = query.or(`title.ilike.%${trimmedSearch}%,description.ilike.%${trimmedSearch}%,purpose.ilike.%${trimmedSearch}%`);
    } else {
      // If using manual join, we need to filter on the related task
      // Note: This is more complex and may require adjusting based on your exact schema
      query = query.or(`task.title.ilike.%${trimmedSearch}%,task.description.ilike.%${trimmedSearch}%,task.purpose.ilike.%${trimmedSearch}%`);
    }
    
    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order('added_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      // If view query failed, try the fallback approach
      if (useView && error.message?.includes('master_library_view')) {
        console.log('View query failed, retrying with manual join...');
        
        let fallbackQuery = supabase
          .from('master_library_tasks')
          .select(includeTaskDetails ? 
            `
              *,
              task:tasks!inner(*)
            ` : 
            '*',
            { count: 'exact' }
          );
        
        // Apply organization filter
        if (organizationId) {
          fallbackQuery = fallbackQuery.eq('white_label_id', organizationId);
        } else {
          fallbackQuery = fallbackQuery.is('white_label_id', null);
        }
        
        // Search in the joined task fields
        fallbackQuery = fallbackQuery.or(`task.title.ilike.%${trimmedSearch}%,task.description.ilike.%${trimmedSearch}%,task.purpose.ilike.%${trimmedSearch}%`);
        
        // Apply pagination
        fallbackQuery = fallbackQuery
          .range(offset, offset + limit - 1)
          .order('added_at', { ascending: false });
        
        const fallbackResult = await fallbackQuery;
        
        if (fallbackResult.error) {
          console.error('Error in fallback search query:', fallbackResult.error);
          return { data: null, error: fallbackResult.error.message, totalCount: 0 };
        }
        
        console.log(`✅ Fallback search completed: ${fallbackResult.data?.length || 0} results found`);
        return { 
          data: fallbackResult.data || [], 
          error: null, 
          totalCount: fallbackResult.count || 0 
        };
      }
      
      console.error('Error searching master library tasks:', error);
      return { data: null, error: error.message, totalCount: 0 };
    }
    
    console.log(`✅ Search completed: ${data?.length || 0} results found (total: ${count || 0})`);
    return { 
      data: data || [], 
      error: null, 
      totalCount: count || 0 
    };
  } catch (err) {
    console.error('Error in searchMasterLibraryTasks:', err);
    return { data: null, error: err.message, totalCount: 0 };
  }
};

export default {
  fetchAllTasks,
  fetchTasksForProjects,
  createTask,
  updateTaskCompletion,
  updateTaskPosition,
  updateTaskDateFields,
  updateTaskFields,
  updateTaskComplete,
  updateTaskHierarchy,
  deleteTask,
  getTaskById,
  getTasksByParent,
  getTaskWithPermissions,
  findRootProject,
  batchUpdateTasks,
  getTaskStatistics,
  // Master Library functions
  addToMasterLibrary,
  removeFromMasterLibrary,
  checkIfInMasterLibrary,
  getMasterLibraryTasks,
  searchMasterLibraryTasks,
};