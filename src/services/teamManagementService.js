// src/services/teamManagementService.js
import { supabase } from '../supabaseClient';

/**
 * Get all members of a project with their user details
 * @param {string} projectId - ID of the project
 * @returns {Promise<{data: Array, error: string}>} - List of project members or error
 */
export const getProjectMembers = async (projectId) => {
  try {
    console.log('Fetching members for project:', projectId);
    
    if (!projectId) {
      return { data: null, error: 'Project ID is required' };
    }
    
    const { data, error } = await supabase
      .from('project_memberships')
      .select(`
        id,
        project_id,
        user_id,
        role,
        invited_by,
        invited_at,
        accepted_at,
        status,
        created_at,
        updated_at,
        user:users!project_memberships_user_id_fkey(
          id,
          email,
          first_name,
          last_name
        ),
        inviter:users!project_memberships_invited_by_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching project members:', error);
      return { data: null, error: error.message || 'Failed to fetch project members' };
    }
    
    console.log(`Found ${data?.length || 0} members for project ${projectId}`);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error in getProjectMembers:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Add a member directly to a project (bypassing invitation process)
 * @param {string} projectId - ID of the project
 * @param {string} userId - ID of the user to add
 * @param {string} role - Role to assign ('owner', 'full_user', 'limited_user', 'coach')
 * @param {string} invitedBy - ID of user adding the member
 * @returns {Promise<{data: Object, error: string}>} - The created membership or error
 */
export const addProjectMember = async (projectId, userId, role, invitedBy) => {
  try {
    console.log('Adding member to project:', { projectId, userId, role, invitedBy });
    
    // Validate inputs
    if (!projectId || !userId || !role || !invitedBy) {
      return { data: null, error: 'Missing required fields: projectId, userId, role, and invitedBy are required' };
    }
    
    // Validate role
    const validRoles = ['owner', 'full_user', 'limited_user', 'coach'];
    if (!validRoles.includes(role)) {
      return { data: null, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` };
    }
    
    // Check if user exists
    const { error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error checking user existence:', userError);
      if (userError.code === 'PGRST116') {
        return { data: null, error: 'User not found' };
      }
      return { data: null, error: 'Error validating user' };
    }
    
    // Check if project exists and is a top-level project
    const { data: projectExists, error: projectError } = await supabase
      .from('tasks')
      .select('id, title, parent_task_id')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error checking project existence:', projectError);
      if (projectError.code === 'PGRST116') {
        return { data: null, error: 'Project not found' };
      }
      return { data: null, error: 'Error validating project' };
    }
    
    if (projectExists.parent_task_id) {
      return { data: null, error: 'Cannot add members to sub-tasks. Only top-level projects can have members.' };
    }
    
    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from('project_memberships')
      .select('id, role, status')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    
    if (memberError && memberError.code !== 'PGRST116') {
      console.error('Error checking existing membership:', memberError);
      return { data: null, error: 'Error checking existing membership' };
    }
    
    if (existingMember) {
      return { data: null, error: `User is already a member of this project with role: ${existingMember.role}` };
    }
    
    // Create the membership
    const membershipData = {
      project_id: projectId,
      user_id: userId,
      role: role,
      invited_by: invitedBy,
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(), // Direct addition means immediate acceptance
      status: 'accepted'
    };
    
    const { data, error } = await supabase
      .from('project_memberships')
      .insert([membershipData])
      .select(`
        *,
        user:users!project_memberships_user_id_fkey(
          id,
          email,
          first_name,
          last_name
        ),
        inviter:users!project_memberships_invited_by_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) {
      console.error('Error creating membership:', error);
      return { data: null, error: error.message || 'Failed to add member to project' };
    }
    
    console.log('Member added successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Error in addProjectMember:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Update a member's role in a project
 * @param {string} projectId - ID of the project
 * @param {string} userId - ID of the user whose role to update
 * @param {string} newRole - New role to assign
 * @param {string} updatedBy - ID of user making the change
 * @returns {Promise<{data: Object, error: string}>} - The updated membership or error
 */
export const updateMemberRole = async (projectId, userId, newRole, updatedBy) => {
  try {
    console.log('Updating member role:', { projectId, userId, newRole, updatedBy });
    
    // Validate inputs
    if (!projectId || !userId || !newRole || !updatedBy) {
      return { data: null, error: 'Missing required fields: projectId, userId, newRole, and updatedBy are required' };
    }
    
    // Validate role
    const validRoles = ['owner', 'full_user', 'limited_user', 'coach'];
    if (!validRoles.includes(newRole)) {
      return { data: null, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` };
    }
    
    // Find existing membership
    const { data: existingMember, error: memberError } = await supabase
      .from('project_memberships')
      .select('id, role, status')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    
    if (memberError) {
      console.error('Error finding membership:', memberError);
      if (memberError.code === 'PGRST116') {
        return { data: null, error: 'User is not a member of this project' };
      }
      return { data: null, error: 'Error finding membership' };
    }
    
    if (existingMember.status !== 'accepted') {
      return { data: null, error: 'Cannot update role for non-accepted members' };
    }
    
    if (existingMember.role === newRole) {
      return { data: null, error: `User already has the role: ${newRole}` };
    }
    
    // Update the membership
    const { data, error } = await supabase
      .from('project_memberships')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select(`
        *,
        user:users!project_memberships_user_id_fkey(
          id,
          email,
          first_name,
          last_name
        ),
        inviter:users!project_memberships_invited_by_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) {
      console.error('Error updating member role:', error);
      return { data: null, error: error.message || 'Failed to update member role' };
    }
    
    console.log('Member role updated successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Error in updateMemberRole:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Remove a member from a project
 * @param {string} projectId - ID of the project
 * @param {string} userId - ID of the user to remove
 * @param {string} removedBy - ID of user removing the member
 * @returns {Promise<{data: Object, error: string}>} - Success result or error
 */
export const removeMember = async (projectId, userId, removedBy) => {
  try {
    console.log('Removing member from project:', { projectId, userId, removedBy });
    
    // Validate inputs
    if (!projectId || !userId || !removedBy) {
      return { data: null, error: 'Missing required fields: projectId, userId, and removedBy are required' };
    }
    
    // Find existing membership
    const { data: existingMember, error: memberError } = await supabase
      .from('project_memberships')
      .select(`
        id,
        role,
        status,
        user:users!project_memberships_user_id_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    
    if (memberError) {
      console.error('Error finding membership:', memberError);
      if (memberError.code === 'PGRST116') {
        return { data: null, error: 'User is not a member of this project' };
      }
      return { data: null, error: 'Error finding membership' };
    }
    
    // Check if trying to remove the last owner
    if (existingMember.role === 'owner') {
      const { data: ownerCount, error: ownerError } = await supabase
        .from('project_memberships')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId)
        .eq('role', 'owner')
        .eq('status', 'accepted');
      
      if (ownerError) {
        console.error('Error counting owners:', ownerError);
        return { data: null, error: 'Error validating owner count' };
      }
      
      if (ownerCount && ownerCount.length <= 1) {
        return { data: null, error: 'Cannot remove the last owner of a project. Transfer ownership first or assign another owner.' };
      }
    }
    
    // Remove the membership
    const { data, error } = await supabase
      .from('project_memberships')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error removing member:', error);
      return { data: null, error: error.message || 'Failed to remove member' };
    }
    
    console.log('Member removed successfully:', data);
    return { 
      data: {
        removedMembership: data,
        removedUser: existingMember.user,
        removedBy
      }, 
      error: null 
    };
  } catch (err) {
    console.error('Error in removeMember:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Get all projects a user has access to
 * @param {string} userId - ID of the user
 * @returns {Promise<{data: Array, error: string}>} - List of user's projects or error
 */
export const getUserProjects = async (userId) => {
  try {
    console.log('Fetching projects for user:', userId);
    
    if (!userId) {
      return { data: null, error: 'User ID is required' };
    }
    
    const { data, error } = await supabase
      .from('project_memberships')
      .select(`
        id,
        role,
        status,
        invited_at,
        accepted_at,
        project:tasks!project_memberships_project_id_fkey(
          id,
          title,
          description,
          purpose,
          start_date,
          due_date,
          created_at,
          last_modified
        ),
        inviter:users!project_memberships_invited_by_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user projects:', error);
      return { data: null, error: error.message || 'Failed to fetch user projects' };
    }
    
    console.log(`Found ${data?.length || 0} projects for user ${userId}`);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error in getUserProjects:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Get member details for a specific user in a specific project
 * @param {string} projectId - ID of the project
 * @param {string} userId - ID of the user
 * @returns {Promise<{data: Object, error: string}>} - Member details or error
 */
export const getProjectMember = async (projectId, userId) => {
  try {
    console.log('Fetching member details:', { projectId, userId });
    
    if (!projectId || !userId) {
      return { data: null, error: 'Project ID and User ID are required' };
    }
    
    const { data, error } = await supabase
      .from('project_memberships')
      .select(`
        *,
        user:users!project_memberships_user_id_fkey(
          id,
          email,
          first_name,
          last_name
        ),
        inviter:users!project_memberships_invited_by_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching member details:', error);
      if (error.code === 'PGRST116') {
        return { data: null, error: 'User is not a member of this project' };
      }
      return { data: null, error: error.message || 'Failed to fetch member details' };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error in getProjectMember:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Check if a user has a specific role or higher in a project
 * @param {string} projectId - ID of the project
 * @param {string} userId - ID of the user
 * @param {string} requiredRole - Minimum required role
 * @returns {Promise<{data: boolean, error: string}>} - Whether user has required role or error
 */
export const checkUserRole = async (projectId, userId, requiredRole) => {
  try {
    const roleHierarchy = {
      'limited_user': 1,
      'coach': 2,
      'full_user': 3,
      'owner': 4
    };
    
    const { data: member, error } = await getProjectMember(projectId, userId);
    
    if (error) {
      return { data: false, error };
    }
    
    if (!member || member.status !== 'accepted') {
      return { data: false, error: 'User is not an active member of this project' };
    }
    
    const userRoleLevel = roleHierarchy[member.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    return { data: userRoleLevel >= requiredRoleLevel, error: null };
  } catch (err) {
    console.error('Error in checkUserRole:', err);
    return { data: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Get project membership statistics
 * @param {string} projectId - ID of the project
 * @returns {Promise<{data: Object, error: string}>} - Membership statistics or error
 */
export const getProjectMembershipStats = async (projectId) => {
  try {
    console.log('Fetching membership stats for project:', projectId);
    
    if (!projectId) {
      return { data: null, error: 'Project ID is required' };
    }
    
    const { data, error } = await supabase
      .from('project_memberships')
      .select('role, status')
      .eq('project_id', projectId);
    
    if (error) {
      console.error('Error fetching membership stats:', error);
      return { data: null, error: error.message || 'Failed to fetch membership statistics' };
    }
    
    const stats = {
      total: data.length,
      byRole: {},
      byStatus: {},
      activeMembers: 0
    };
    
    data.forEach(member => {
      // Count by role
      stats.byRole[member.role] = (stats.byRole[member.role] || 0) + 1;
      
      // Count by status
      stats.byStatus[member.status] = (stats.byStatus[member.status] || 0) + 1;
      
      // Count active members
      if (member.status === 'accepted') {
        stats.activeMembers++;
      }
    });
    
    return { data: stats, error: null };
  } catch (err) {
    console.error('Error in getProjectMembershipStats:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
};

const teamManagementService = {
  getProjectMembers,
  addProjectMember,
  updateMemberRole,
  removeMember,
  getUserProjects,
  getProjectMember,
  checkUserRole,
  getProjectMembershipStats
};

export default teamManagementService;