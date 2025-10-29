// src/hooks/useInvitations.js
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../components/contexts/AuthContext';
import { 
  createInvitation,
  getProjectInvitations,
  getPendingInvitationsForUser,
  acceptInvitation,
  declineInvitation,
  revokeInvitation, 
} from '../services/invitationService';

/**
 * Custom hook for managing project invitations
 * Handles sending, accepting, declining, and revoking invitations
 */
export const useInvitations = () => {
  const { user } = useAuth();
  
  // State for invitations
  const [projectInvitations, setProjectInvitations] = useState([]);
  const [userPendingInvitations, setUserPendingInvitations] = useState([]);
  const [invitationLoading, setInvitationLoading] = useState(false);

  /**
   * Fetch all invitations for a specific project
   * @param {string} projectId - ID of the project
   * @returns {Promise<{success: boolean, data: Array, error: string}>}
   */
  const fetchProjectInvitations = useCallback(async (projectId) => {
    try {
      if (!projectId) {
        return { success: false, error: 'Project ID is required' };
      }
      
      console.log('Fetching project invitations for:', projectId);
      
      const result = await getProjectInvitations(projectId);
      
      if (result.error) {
        return { success: false, error: result.error };
      }

      console.log('Logging project invitations', result);
      
      setProjectInvitations(result.data || []);
      return { success: true, data: result.data || [] };
    } catch (err) {
      console.error('Error fetching project invitations:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Fetch pending invitations for the current user
   * @returns {Promise<{success: boolean, data: Array, error: string}>}
   */
  const fetchUserPendingInvitations = useCallback(async () => {
    try {
      if (!user?.email) {
        return { success: false, error: 'User email not available' };
      }
      
      console.log('Fetching pending invitations for user:', user.email);
      
      const result = await getPendingInvitationsForUser(user.email);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      setUserPendingInvitations(result.data || []);
      return { success: true, data: result.data || [] };
    } catch (err) {
      console.error('Error fetching user invitations:', err);
      return { success: false, error: err.message };
    }
  }, [user?.email]);

  /**
   * Send an invitation to join a project
   * @param {string} projectId - ID of the project
   * @param {string} email - Email address to invite
   * @param {string} role - Role to assign
   * @returns {Promise<{success: boolean, data: Object, error: string}>}
   */
  const sendProjectInvitation = useCallback(async (projectId, email, role) => {
    try {
      setInvitationLoading(true);

      if (!user?.id) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Sending project invitation:', { projectId, email, role });

      const result = await createInvitation(projectId, email, role, user.id);

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Refresh project invitations
      await fetchProjectInvitations(projectId);

      return { success: true, data: result.data };
    } catch (err) {
      console.error('Error sending invitation:', err);
      return { success: false, error: err.message };
    } finally {
      setInvitationLoading(false);
    }
  }, [user?.id, fetchProjectInvitations]);

  /**
   * Accept a project invitation (simplified - using invitation ID)
   * @param {string} invitationId - The invitation ID
   * @param {Function} onSuccess - Optional callback when invitation is accepted successfully
   * @returns {Promise<{success: boolean, data: Object, error: string}>}
   */
  const acceptProjectInvitation = useCallback(async (invitationId, onSuccess) => {
    try {
      setInvitationLoading(true);
      
      if (!user?.id) {
        return { success: false, error: 'User not authenticated' };
      }
      
      console.log('Accepting invitation:', invitationId);
      
      const result = await acceptInvitation(invitationId, user.id);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      // Refresh user's pending invitations
      await fetchUserPendingInvitations();
      
      // Call optional success callback (e.g., to refresh tasks)
      if (onSuccess && typeof onSuccess === 'function') {
        await onSuccess();
      }
      
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Error accepting invitation:', err);
      return { success: false, error: err.message };
    } finally {
      setInvitationLoading(false);
    }
  }, [user?.id, fetchUserPendingInvitations]);

  /**
   * Decline a project invitation (simplified - using invitation ID)
   * @param {string} invitationId - The invitation ID
   * @returns {Promise<{success: boolean, data: Object, error: string}>}
   */
  const declineProjectInvitation = useCallback(async (invitationId) => {
    try {
      setInvitationLoading(true);
      
      console.log('Declining invitation:', invitationId);
      
      const result = await declineInvitation(invitationId);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      // Refresh user's pending invitations
      await fetchUserPendingInvitations();
      
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Error declining invitation:', err);
      return { success: false, error: err.message };
    } finally {
      setInvitationLoading(false);
    }
  }, [fetchUserPendingInvitations]);

  /**
   * Revoke/cancel a project invitation
   * @param {string} invitationId - ID of the invitation to revoke
   * @param {string} projectId - ID of the project (for refreshing)
   * @returns {Promise<{success: boolean, data: Object, error: string}>}
   */
  const revokeProjectInvitation = useCallback(async (invitationId, projectId) => {
    try {
      setInvitationLoading(true);
      
      if (!user?.id) {
        return { success: false, error: 'User not authenticated' };
      }
      
      console.log('Revoking invitation:', invitationId);
      
      const result = await revokeInvitation(invitationId, user.id);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      // Refresh project invitations
      if (projectId) {
        await fetchProjectInvitations(projectId);
      }
      
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Error revoking invitation:', err);
      return { success: false, error: err.message };
    } finally {
      setInvitationLoading(false);
    }
  }, [user?.id, fetchProjectInvitations]);

  // Fetch pending invitations when user logs in
  useEffect(() => {
    if (user?.email) {
      fetchUserPendingInvitations();
    }
  }, [user?.email, fetchUserPendingInvitations]);

  // Return all invitation-related state and functions
  return {
    // State
    projectInvitations,
    userPendingInvitations,
    invitationLoading,
    
    // Functions
    sendProjectInvitation,
    fetchProjectInvitations,
    fetchUserPendingInvitations,
    acceptProjectInvitation,
    declineProjectInvitation,
    revokeProjectInvitation,
  };
};