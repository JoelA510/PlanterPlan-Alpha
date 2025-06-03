// src/utils/permissionUtils.js
import { PERMISSIONS, ROLE_HIERARCHY } from '../services/permissionService';

/**
 * Utility functions for handling permissions in components
 */

/**
 * Check if a role is higher or equal to another role in hierarchy
 * @param {string} userRole - User's current role
 * @param {string} requiredRole - Required minimum role
 * @returns {boolean} - True if user role is sufficient
 */
export const isRoleSufficient = (userRole, requiredRole) => {
  if (!userRole || !requiredRole) return false;
  
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

/**
 * Get display name for a role
 * @param {string} role - Role identifier
 * @returns {string} - Human-readable role name
 */
export const getRoleDisplayName = (role) => {
  const roleNames = {
    owner: 'Project Owner',
    full_user: 'Full User',
    limited_user: 'Limited User',
    coach: 'Coach'
  };
  
  return roleNames[role] || role;
};

/**
 * Get display name for a permission
 * @param {string} permission - Permission identifier
 * @returns {string} - Human-readable permission name
 */
export const getPermissionDisplayName = (permission) => {
  const permissionNames = {
    [PERMISSIONS.READ]: 'View',
    [PERMISSIONS.WRITE]: 'Edit',
    [PERMISSIONS.DELETE]: 'Delete',
    [PERMISSIONS.INVITE]: 'Invite Members',
    [PERMISSIONS.MANAGE_TEAM]: 'Manage Team',
    [PERMISSIONS.EDIT_PROJECT_SETTINGS]: 'Edit Project Settings',
    [PERMISSIONS.ASSIGN_TASKS]: 'Assign Tasks',
    [PERMISSIONS.VIEW_COACHING_NOTES]: 'View Coaching Notes',
    [PERMISSIONS.EDIT_COACHING_NOTES]: 'Edit Coaching Notes'
  };
  
  return permissionNames[permission] || permission;
};

/**
 * Get all permissions for a role
 * @param {string} role - Role identifier
 * @returns {Array<string>} - Array of permission identifiers
 */
export const getRolePermissions = (role) => {
  const { ROLE_PERMISSIONS } = require('../services/permissionService');
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Get available roles that can be assigned by current user role
 * @param {string} currentUserRole - Current user's role
 * @returns {Array<string>} - Array of roles that can be assigned
 */
export const getAssignableRoles = (currentUserRole) => {
  if (!currentUserRole) return [];
  
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  
  // Users can only assign roles at their level or below (except they can't assign owner)
  return Object.keys(ROLE_HIERARCHY).filter(role => {
    const roleLevel = ROLE_HIERARCHY[role];
    return roleLevel <= currentLevel && role !== 'owner';
  });
};

/**
 * Check if user can assign a specific role
 * @param {string} currentUserRole - Current user's role
 * @param {string} roleToAssign - Role to be assigned
 * @returns {boolean} - True if assignment is allowed
 */
export const canAssignRole = (currentUserRole, roleToAssign) => {
  const assignableRoles = getAssignableRoles(currentUserRole);
  return assignableRoles.includes(roleToAssign);
};

/**
 * Determine what actions a user can perform on a team member
 * @param {string} currentUserRole - Current user's role
 * @param {string} targetUserRole - Target user's role
 * @param {boolean} isTargetSelf - Whether target user is the current user
 * @returns {Object} - Object with action permissions
 */
export const getTeamMemberActions = (currentUserRole, targetUserRole, isTargetSelf = false) => {
  if (!currentUserRole) {
    return {
      canChangeRole: false,
      canRemove: false,
      canViewDetails: false
    };
  }
  
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetUserRole] || 0;
  
  return {
    // Can change role if current user has higher level than target (or equal for non-owners)
    canChangeRole: currentLevel > targetLevel && !isTargetSelf,
    
    // Can remove if current user has higher level than target and it's not themselves
    canRemove: currentLevel > targetLevel && !isTargetSelf,
    
    // Can always view details (this could be refined based on requirements)
    canViewDetails: true
  };
};

/**
 * Filter tasks based on user permissions and role
 * @param {Array} tasks - Array of tasks
 * @param {string} userRole - User's role in the project
 * @param {string} userId - User's ID
 * @param {Object} permissions - User's permissions object
 * @returns {Array} - Filtered tasks
 */
export const filterTasksByPermissions = (tasks, userRole, userId, permissions) => {
  if (!Array.isArray(tasks)) return [];
  
  // If user has full read permissions, return all tasks
  if (permissions[PERMISSIONS.READ]) {
    return tasks;
  }
  
  // For limited users, only show tasks assigned to them or created by them
  if (userRole === 'limited_user') {
    return tasks.filter(task => {
      // Check if user is assigned to the task
      const isAssigned = task.assigned_users && task.assigned_users.includes(userId);
      
      // Check if user created the task
      const isCreator = task.creator === userId;
      
      return isAssigned || isCreator;
    });
  }
  
  // Default: return all tasks (this should rarely happen)
  return tasks;
};

/**
 * Get contextual help text for permissions
 * @param {string} permission - Permission identifier
 * @returns {string} - Help text explaining the permission
 */
export const getPermissionHelpText = (permission) => {
  const helpTexts = {
    [PERMISSIONS.READ]: 'Can view all project tasks and details',
    [PERMISSIONS.WRITE]: 'Can create, edit, and update tasks',
    [PERMISSIONS.DELETE]: 'Can delete tasks and projects',
    [PERMISSIONS.INVITE]: 'Can send invitations to new team members',
    [PERMISSIONS.MANAGE_TEAM]: 'Can add, remove, and change roles of team members',
    [PERMISSIONS.EDIT_PROJECT_SETTINGS]: 'Can modify project settings and configuration',
    [PERMISSIONS.ASSIGN_TASKS]: 'Can assign tasks to team members',
    [PERMISSIONS.VIEW_COACHING_NOTES]: 'Can view coaching notes on tasks',
    [PERMISSIONS.EDIT_COACHING_NOTES]: 'Can add and edit coaching notes on tasks'
  };
  
  return helpTexts[permission] || 'Permission description not available';
};

/**
 * Validate if a permission change is allowed
 * @param {string} currentUserRole - Current user's role
 * @param {string} targetUserRole - Target user's current role
 * @param {string} newRole - New role to be assigned
 * @returns {Object} - { isValid: boolean, reason?: string }
 */
export const validateRoleChange = (currentUserRole, targetUserRole, newRole) => {
  // Only owners can change other owners
  if (targetUserRole === 'owner' && currentUserRole !== 'owner') {
    return { isValid: false, reason: 'Only project owners can modify other owners' };
  }
  
  // Can't assign owner role unless you're an owner
  if (newRole === 'owner' && currentUserRole !== 'owner') {
    return { isValid: false, reason: 'Only project owners can assign owner role' };
  }
  
  // Can't assign a role higher than your own
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const newRoleLevel = ROLE_HIERARCHY[newRole] || 0;
  
  if (newRoleLevel > currentLevel) {
    return { isValid: false, reason: 'Cannot assign a role higher than your own' };
  }
  
  return { isValid: true };
};

/**
 * Generate permission summary for display
 * @param {Object} permissions - Permissions object
 * @param {string} role - User's role
 * @returns {Object} - Summary with categories of permissions
 */
export const getPermissionSummary = (permissions, role) => {
  const summary = {
    basic: [],
    advanced: [],
    admin: []
  };
  
  // Categorize permissions
  Object.entries(permissions).forEach(([permission, hasPermission]) => {
    if (!hasPermission) return;
    
    const displayName = getPermissionDisplayName(permission);
    
    if ([PERMISSIONS.READ, PERMISSIONS.WRITE].includes(permission)) {
      summary.basic.push(displayName);
    } else if ([PERMISSIONS.ASSIGN_TASKS, PERMISSIONS.VIEW_COACHING_NOTES, PERMISSIONS.EDIT_COACHING_NOTES].includes(permission)) {
      summary.advanced.push(displayName);
    } else {
      summary.admin.push(displayName);
    }
  });
  
  return {
    role: getRoleDisplayName(role),
    ...summary
  };
};

export default {
  isRoleSufficient,
  getRoleDisplayName,
  getPermissionDisplayName,
  getRolePermissions,
  getAssignableRoles,
  canAssignRole,
  getTeamMemberActions,
  filterTasksByPermissions,
  getPermissionHelpText,
  validateRoleChange,
  getPermissionSummary,
  PERMISSIONS
};