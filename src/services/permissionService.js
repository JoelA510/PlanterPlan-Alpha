// src/services/permissionService.js
import { supabase } from '../supabaseClient';

// Permission constants
export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write', 
  DELETE: 'delete',
  INVITE: 'invite',
  MANAGE_TEAM: 'manage_team',
  EDIT_PROJECT_SETTINGS: 'edit_project_settings',
  ASSIGN_TASKS: 'assign_tasks',
  VIEW_COACHING_NOTES: 'view_coaching_notes',
  EDIT_COACHING_NOTES: 'edit_coaching_notes'
};

// Role definitions with their permissions
export const ROLE_PERMISSIONS = {
  owner: [
    PERMISSIONS.READ,
    PERMISSIONS.WRITE,
    PERMISSIONS.DELETE,
    PERMISSIONS.INVITE,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.EDIT_PROJECT_SETTINGS,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.VIEW_COACHING_NOTES,
    PERMISSIONS.EDIT_COACHING_NOTES
  ],
  full_user: [
    PERMISSIONS.READ,
    PERMISSIONS.WRITE,
    PERMISSIONS.DELETE,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.VIEW_COACHING_NOTES
  ],
  limited_user: [
    PERMISSIONS.READ,
    PERMISSIONS.WRITE // Can only edit tasks assigned to them (we'll add this logic later)
  ],
  coach: [
    PERMISSIONS.READ,
    PERMISSIONS.WRITE,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.VIEW_COACHING_NOTES,
    PERMISSIONS.EDIT_COACHING_NOTES
  ]
};

// Role hierarchy (higher roles can do everything lower roles can do)
export const ROLE_HIERARCHY = {
  owner: 4,
  full_user: 3,
  coach: 2,
  limited_user: 1
};

/**
* Get user's role in a specific project
* @param {string} userId - ID of the user
* @param {string} projectId - ID of the project
* @returns {Promise<{role: string|null, error: string|null}>}
*/
export const getUserProjectRole = async (userId, projectId) => {
 try {
   if (!userId || !projectId) {
     return { role: null, error: 'User ID and Project ID are required' };
   }

   // First check if user is the creator/owner of the project
   const { data: project, error: projectError } = await supabase
     .from('tasks')
     .select('creator')
     .eq('id', projectId)
     .is('parent_task_id', null) // Ensure it's a top-level project
     .single();

   if (projectError) {
     console.error('Error fetching project:', projectError);
     return { role: null, error: 'Failed to fetch project information' };
   }

   if (project && project.creator === userId) {
     return { role: 'owner', error: null };
   }

   // Check project memberships table
   const { data: membership, error: membershipError } = await supabase
     .from('project_memberships')
     .select('role')
     .eq('user_id', userId)
     .eq('project_id', projectId)
     .eq('status', 'accepted')
     .single();

   if (membershipError) {
     if (membershipError.code === 'PGRST116') {
       // No membership found - user has no access
       return { role: null, error: null };
     }
     console.error('Error fetching membership:', membershipError);
     return { role: null, error: 'Failed to fetch membership information' };
   }

   return { role: membership.role, error: null };
 } catch (err) {
   console.error('Error in getUserProjectRole:', err);
   return { role: null, error: err.message };
 }
};

/**
* Check if user can access a project (basic read access)
* @param {string} userId - ID of the user
* @param {string} projectId - ID of the project
* @returns {Promise<{canAccess: boolean, error: string|null}>}
*/
export const canUserAccessProject = async (userId, projectId) => {
 try {
   const { role, error } = await getUserProjectRole(userId, projectId);
   
   if (error) {
     return { canAccess: false, error };
   }

   return { canAccess: role !== null, error: null };
 } catch (err) {
   console.error('Error in canUserAccessProject:', err);
   return { canAccess: false, error: err.message };
 }
};

/**
* Check if user has a specific permission for a project
* @param {string} userId - ID of the user
* @param {string} projectId - ID of the project
* @param {string} permission - Permission to check (from PERMISSIONS constants)
* @returns {Promise<{hasPermission: boolean, error: string|null}>}
*/
export const userHasProjectPermission = async (userId, projectId, permission) => {
 try {
   const { role, error } = await getUserProjectRole(userId, projectId);
   
   if (error) {
     return { hasPermission: false, error };
   }

   if (!role) {
     return { hasPermission: false, error: null };
   }

   const rolePermissions = ROLE_PERMISSIONS[role] || [];
   const hasPermission = rolePermissions.includes(permission);

   return { hasPermission, error: null };
 } catch (err) {
   console.error('Error in userHasProjectPermission:', err);
   return { hasPermission: false, error: err.message };
 }
};

/**
* Check if user can edit a specific task
* @param {string} userId - ID of the user
* @param {string} taskId - ID of the task
* @param {string} projectId - ID of the project (optional, will be fetched if not provided)
* @returns {Promise<{canEdit: boolean, error: string|null}>}
*/
export const canUserEditTask = async (userId, taskId, projectId = null) => {
 try {
   let actualProjectId = projectId;

   // If projectId not provided, find it from the task
   if (!actualProjectId) {
     const { data: task, error: taskError } = await supabase
       .from('tasks')
       .select('id')
       .eq('id', taskId)
       .single();

     if (taskError || !task) {
       return { canEdit: false, error: 'Task not found' };
     }

     // Find the root project for this task
     actualProjectId = await findRootProjectId(taskId);
     if (!actualProjectId) {
       return { canEdit: false, error: 'Could not find project for task' };
     }
   }

   // Check if user has write permission for the project
   const { hasPermission, error } = await userHasProjectPermission(userId, actualProjectId, PERMISSIONS.WRITE);
   
   if (error) {
     return { canEdit: false, error };
   }

   // TODO: Add logic for limited_user role - they can only edit tasks assigned to them
   // For now, just return the basic permission check
   return { canEdit: hasPermission, error: null };
 } catch (err) {
   console.error('Error in canUserEditTask:', err);
   return { canEdit: false, error: err.message };
 }
};

/**
* Check if user can manage team for a project
* @param {string} userId - ID of the user
* @param {string} projectId - ID of the project
* @returns {Promise<{canManage: boolean, error: string|null}>}
*/
export const canUserManageTeam = async (userId, projectId) => {
 return await userHasProjectPermission(userId, projectId, PERMISSIONS.MANAGE_TEAM);
};

/**
* Check if user can invite members to a project
* @param {string} userId - ID of the user
* @param {string} projectId - ID of the project
* @returns {Promise<{canInvite: boolean, error: string|null}>}
*/
export const canUserInviteMembers = async (userId, projectId) => {
 return await userHasProjectPermission(userId, projectId, PERMISSIONS.INVITE);
};

/**
* Get comprehensive permissions object for user in a project
* @param {string} userId - ID of the user
* @param {string} projectId - ID of the project
* @returns {Promise<{permissions: Object, role: string|null, error: string|null}>}
*/
export const getUserProjectPermissions = async (userId, projectId) => {
 try {
   const { role, error } = await getUserProjectRole(userId, projectId);
   
   if (error) {
     return { permissions: {}, role: null, error };
   }

   if (!role) {
     return { 
       permissions: {}, 
       role: null, 
       error: null 
     };
   }

   const rolePermissions = ROLE_PERMISSIONS[role] || [];
   
   // Create permissions object for easy checking
   const permissions = {};
   Object.values(PERMISSIONS).forEach(permission => {
     permissions[permission] = rolePermissions.includes(permission);
   });

   return { permissions, role, error: null };
 } catch (err) {
   console.error('Error in getUserProjectPermissions:', err);
   return { permissions: {}, role: null, error: err.message };
 }
};

/**
* Helper function to find the root project ID for any task
* @param {string} taskId - ID of the task
* @returns {Promise<string|null>} - Root project ID or null
*/
const findRootProjectId = async (taskId) => {
 try {
   let currentTaskId = taskId;
   let iterations = 0;
   const maxIterations = 20; // Prevent infinite loops

   while (iterations < maxIterations) {
     const { data: task, error } = await supabase
       .from('tasks')
       .select('id, parent_task_id')
       .eq('id', currentTaskId)
       .single();

     if (error || !task) {
       return null;
     }

     if (!task.parent_task_id) {
       // This is the root project
       return task.id;
     }

     currentTaskId = task.parent_task_id;
     iterations++;
   }

   return null; // Couldn't find root within max iterations
 } catch (err) {
   console.error('Error finding root project:', err);
   return null;
 }
};

export default {
 getUserProjectRole,
 canUserAccessProject,
 userHasProjectPermission,
 canUserEditTask,
 canUserManageTeam,
 canUserInviteMembers,
 getUserProjectPermissions,
 PERMISSIONS,
 ROLE_PERMISSIONS,
 ROLE_HIERARCHY
};