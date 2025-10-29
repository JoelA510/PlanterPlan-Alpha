// src/components/Test/InvitationTest.js
import React, { useState, useEffect } from 'react';
import { useTasks } from './contexts/TaskContext';
import { useAuth } from './contexts/AuthContext';
import { useInvitations } from '../hooks/useInvitations'; // Import the new hook
import { getInvitationsSentByUser } from '../services/invitationService';
import { supabase } from '../supabaseClient';

const Invitations = () => {
  const { user } = useAuth();
  const { instanceTasks, fetchTasks } = useTasks(); // Only get what we need from TaskContext
  
  // Use the new invitation hook
  const {
    projectInvitations,
    userPendingInvitations,
    invitationLoading,
    sendProjectInvitation,
    fetchProjectInvitations,
    fetchUserPendingInvitations,
    acceptProjectInvitation,
    declineProjectInvitation,
    revokeProjectInvitation
  } = useInvitations();

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('full_user');
  const [message, setMessage] = useState('');
  
  // State for sent invitations
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loadingSentInvitations, setLoadingSentInvitations] = useState(false);
  
  // New state for accepted invitations
  const [acceptedInvitations, setAcceptedInvitations] = useState([]);
  const [loadingAcceptedInvitations, setLoadingAcceptedInvitations] = useState(false);

  // Get top-level projects for the dropdown and exclude archived ones
  const topLevelProjects = instanceTasks.filter(task => !task.parent_task_id);
  const activeProjects = topLevelProjects.filter(project => !project.is_archived);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectInvitations(selectedProjectId);
    }
  }, [selectedProjectId, fetchProjectInvitations]);

  // Function to fetch accepted invitations for the current user
  const fetchAcceptedInvitations = async () => {
    if (!user?.email) {
      setMessage('Error: User email not available');
      return;
    }

    setLoadingAcceptedInvitations(true);
    console.log('Fetching accepted invitations for user email:', user.email);
    
    try {
      // Fetch accepted invitations by user's email
      const { data, error } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching accepted invitations:', error);
        setMessage(`Error fetching accepted invitations: ${error.message}`);
        setAcceptedInvitations([]);
      } else {
        console.log('Accepted invitations loaded:', data);
        setAcceptedInvitations(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching accepted invitations:', error);
      setMessage(`Unexpected error: ${error.message}`);
      setAcceptedInvitations([]);
    } finally {
      setLoadingAcceptedInvitations(false);
    }
  };

  // Function to fetch sent invitations
  const fetchSentInvitations = async () => {
    if (!user?.id) {
      setMessage('Error: User not authenticated');
      return;
    }

    setLoadingSentInvitations(true);
    console.log('Fetching sent invitations for user:', user.id);
    
    try {
      const result = await getInvitationsSentByUser(user.id);
      
      if (result.error) {
        console.error('Error fetching sent invitations:', result.error);
        setMessage(`Error fetching sent invitations: ${result.error}`);
        setSentInvitations([]);
      } else {
        console.log('Sent invitations loaded:', result.data);
        setSentInvitations(result.data || []);
        
        if (result.data.length === 0) {
          setMessage('No sent invitations found. Try sending an invitation first.');
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching sent invitations:', error);
      setMessage(`Unexpected error: ${error.message}`);
      setSentInvitations([]);
    } finally {
      setLoadingSentInvitations(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!selectedProjectId || !inviteEmail) {
      setMessage('Please select a project and enter an email');
      return;
    }

    const result = await sendProjectInvitation(selectedProjectId, inviteEmail, inviteRole);
    if (result.success) {
      setMessage('Invitation sent successfully!');
      setInviteEmail('');
      // Refresh sent invitations to show the new one
      setTimeout(() => fetchSentInvitations(), 1000);
    } else {
      setMessage(`Error: ${result.error}`);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    // Pass fetchTasks as the onSuccess callback to refresh tasks when invitation is accepted
    const result = await acceptProjectInvitation(invitationId, () => fetchTasks(true));
    if (result.success) {
      setMessage('Invitation accepted successfully!');
      // Refresh both pending and accepted invitations
      setTimeout(() => {
        fetchUserPendingInvitations();
        fetchAcceptedInvitations();
      }, 500);
    } else {
      setMessage(`Error: ${result.error}`);
    }
  };

  const handleDeclineInvitation = async (invitationId) => {
    const result = await declineProjectInvitation(invitationId);
    if (result.success) {
      setMessage('Invitation declined successfully!');
      // Refresh pending invitations
      setTimeout(() => fetchUserPendingInvitations(), 500);
    } else {
      setMessage(`Error: ${result.error}`);
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    const result = await revokeProjectInvitation(invitationId, selectedProjectId);
    if (result.success) {
      setMessage('Invitation revoked successfully!');
      // Refresh sent invitations to show updated status
      setTimeout(() => fetchSentInvitations(), 500);
    } else {
      setMessage(`Error: ${result.error}`);
    }
  };

  // Helper function to get status badge styling
  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      marginLeft: '10px'
    };

    switch (status) {
      case 'pending':
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
      case 'accepted':
        return { ...baseStyle, backgroundColor: '#d1fae5', color: '#065f46' };
      case 'declined':
        return { ...baseStyle, backgroundColor: '#fee2e2', color: '#b91c1c' };
      case 'revoked':
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
      case 'expired':
        return { ...baseStyle, backgroundColor: '#fde2e2', color: '#7f1d1d' };
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Invitation System Test (Simplified)</h2>
      
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: message.includes('Error') ? '#fee2e2' : '#d1fae5',
          color: message.includes('Error') ? '#b91c1c' : '#065f46',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      {/* Send Invitation Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <h3>Send Invitation</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Select Project:</label>
          <select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
          >
            <option value="">Choose a project...</option>
            {activeProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Role:</label>
          <select 
            value={inviteRole} 
            onChange={(e) => setInviteRole(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '150px' }}
          >
            <option value="full_user">Full User</option>
            <option value="limited_user">Limited User</option>
            <option value="coach">Coach</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        <button 
          onClick={handleSendInvitation}
          disabled={invitationLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: invitationLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {invitationLoading ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>

      {/* My Sent Invitations Status Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>All My Sent Invitations</h3>
          <button 
            onClick={fetchSentInvitations}
            disabled={loadingSentInvitations || !user?.id}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (loadingSentInvitations || !user?.id) ? 'not-allowed' : 'pointer'
            }}
          >
            {loadingSentInvitations ? 'Loading...' : 'Load Sent Invitations'}
          </button>
        </div>
        
        {!user?.id ? (
          <p style={{ color: '#ef4444' }}>Error: User not authenticated. Please log in to view sent invitations.</p>
        ) : loadingSentInvitations ? (
          <p>Loading sent invitations...</p>
        ) : sentInvitations.length === 0 ? (
          <p>No invitations sent yet. <button onClick={fetchSentInvitations} style={{ color: '#3b82f6', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}>Click to load</button></p>
        ) : (
          <div>
            <p style={{ marginBottom: '15px', color: '#6b7280', fontSize: '14px' }}>
              Showing {sentInvitations.length} invitation(s) sent by you
            </p>
            
            {sentInvitations.map(invitation => (
              <div key={invitation.id} style={{ 
                padding: '15px', 
                marginBottom: '10px', 
                backgroundColor: '#f9fafb', 
                borderRadius: '4px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                      <strong>{invitation.email}</strong>
                      <span style={getStatusBadgeStyle(invitation.status)}>
                        {invitation.status}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                      <strong>Project ID:</strong> {invitation.project_id}
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                      <strong>Role:</strong> {invitation.role}
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      <div>Sent: {new Date(invitation.created_at).toLocaleDateString()}</div>
                      <div>Expires: {new Date(invitation.expires_at).toLocaleDateString()}</div>
                      {invitation.accepted_at && (
                        <div>Accepted: {new Date(invitation.accepted_at).toLocaleDateString()}</div>
                      )}
                      <div>Invitation ID: {invitation.id}</div>
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '15px' }}>
                    {invitation.status === 'pending' && (
                      <button 
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '12px', 
                          backgroundColor: '#ef4444', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Invitations Section - UPDATED WITH STATUS BADGES */}
      {selectedProjectId && (
        <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <h3>Project Invitations (Selected Project Only)</h3>
          {projectInvitations.length === 0 ? (
            <p>No invitations for this project.</p>
          ) : (
            <div>
              {projectInvitations.map(invitation => (
                <div key={invitation.id} style={{ 
                  padding: '15px', 
                  marginBottom: '10px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                        <strong>{invitation.email}</strong>
                        <span style={getStatusBadgeStyle(invitation.status)}>
                          {invitation.status}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                        <strong>Role:</strong> {invitation.role}
                      </div>
                      
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        <div>Invited by: {invitation.inviter?.first_name} {invitation.inviter?.last_name}</div>
                        <div>Sent: {new Date(invitation.created_at).toLocaleDateString()}</div>
                        <div>Expires: {new Date(invitation.expires_at).toLocaleDateString()}</div>
                        {invitation.accepted_at && (
                          <div>Accepted: {new Date(invitation.accepted_at).toLocaleDateString()}</div>
                        )}
                        <div>ID: {invitation.id}</div>
                      </div>
                    </div>
                    
                    <div style={{ marginLeft: '15px' }}>
                      {invitation.status === 'pending' && (
                        <button 
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '12px', 
                            backgroundColor: '#ef4444', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Pending Invitations Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <h3>My Pending Invitations</h3>
        <button 
          onClick={fetchUserPendingInvitations}
          style={{ marginBottom: '15px', padding: '5px 10px' }}
        >
          Refresh
        </button>
        
        {userPendingInvitations.length === 0 ? (
          <p>No pending invitations.</p>
        ) : (
          <div>
            {userPendingInvitations.map(invitation => (
              <div key={invitation.id} style={{ 
                padding: '15px', 
                marginBottom: '10px', 
                backgroundColor: '#f9fafb', 
                borderRadius: '4px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Project:</strong> {invitation.project?.title}<br />
                  <strong>Role:</strong> {invitation.role}<br />
                  <strong>From:</strong> {invitation.inviter?.first_name} {invitation.inviter?.last_name}<br />
                  <small>Expires: {new Date(invitation.expires_at).toLocaleDateString()}</small>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    disabled={invitationLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: invitationLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Accept
                  </button>

                  <button 
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    disabled={invitationLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: invitationLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NEW: My Accepted Invitations Section */}
      <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>My Accepted Invitations</h3>
          <button 
            onClick={fetchAcceptedInvitations}
            disabled={loadingAcceptedInvitations || !user?.email}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (loadingAcceptedInvitations || !user?.email) ? 'not-allowed' : 'pointer'
            }}
          >
            {loadingAcceptedInvitations ? 'Loading...' : 'Load Accepted'}
          </button>
        </div>
        
        {!user?.email ? (
          <p style={{ color: '#ef4444' }}>Error: User email not available.</p>
        ) : loadingAcceptedInvitations ? (
          <p>Loading accepted invitations...</p>
        ) : acceptedInvitations.length === 0 ? (
          <p>No accepted invitations yet. <button onClick={fetchAcceptedInvitations} style={{ color: '#3b82f6', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}>Click to load</button></p>
        ) : (
          <div>
            <p style={{ marginBottom: '15px', color: '#6b7280', fontSize: '14px' }}>
              Showing {acceptedInvitations.length} accepted invitation(s)
            </p>
            
            {acceptedInvitations.map(invitation => (
              <div key={invitation.id} style={{ 
                padding: '15px', 
                marginBottom: '10px', 
                backgroundColor: '#f0f9ff', 
                borderRadius: '4px',
                border: '1px solid #bfdbfe'
              }}>
                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                  <strong>Project ID: {invitation.project_id}</strong>
                  <span style={getStatusBadgeStyle(invitation.status)}>
                    {invitation.status}
                  </span>
                </div>
                
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                  <strong>Role:</strong> {invitation.role}
                </div>
                
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  <div>Originally sent: {new Date(invitation.created_at).toLocaleDateString()}</div>
                  {invitation.accepted_at && (
                    <div>Accepted: {new Date(invitation.accepted_at).toLocaleDateString()}</div>
                  )}
                  <div>Invitation ID: {invitation.id}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Invitations;