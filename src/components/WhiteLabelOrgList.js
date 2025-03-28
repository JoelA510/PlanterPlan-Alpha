import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

const WhiteLabelOrgList = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      // Fetch organizations from Supabase
      const { data, error } = await supabase
        .from('white_label_orgs')
        .select('*, admin_user:admin_user_id(first_name, last_name, email)')
        .order('organization_name');

      if (error) throw new Error(error.message);
      
      console.log('Fetched organizations:', data);
      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(`Failed to load organizations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to select an organization and show its details
  const selectOrg = (orgId) => {
    setSelectedOrgId(prevId => prevId === orgId ? null : orgId);
  };
  
  // Get the selected organization
  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  // Render the organizations list
  const renderOrgList = () => {
    if (organizations.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#6b7280'
        }}>
          No white label organizations found.
        </div>
      );
    }
    
    return organizations.map((org) => (
      <div 
        key={org.id}
        onClick={() => selectOrg(org.id)}
        className={selectedOrgId === org.id ? 'selected-org' : ''}
        style={{
          padding: '12px',
          borderRadius: '4px',
          backgroundColor: selectedOrgId === org.id 
            ? (org.primary_color ? `${org.primary_color}30` : '#3b82f620') 
            : 'white',
          border: '1px solid #e5e7eb',
          marginBottom: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: selectedOrgId === org.id 
            ? `0 0 0 2px white, 0 0 0 4px ${org.primary_color || '#3b82f6'}20` 
            : 'none',
        }}
      >
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: '4px'
          }}>
            {org.logo ? (
              <img 
                src={org.logo} 
                alt={`${org.organization_name} logo`} 
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  marginRight: '8px',
                  objectFit: 'contain'
                }} 
              />
            ) : (
              <div style={{
                width: '24px',
                height: '24px',
                marginRight: '8px',
                backgroundColor: org.primary_color || '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px'
              }}>
                {org.organization_name.charAt(0).toUpperCase()}
              </div>
            )}
            <h3 style={{ margin: 0, fontWeight: 'bold' }}>
              {org.organization_name}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            {org.subdomain}.yourdomain.com
          </p>
        </div>
        <div style={{
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: 
            org.status === 'active' ? '#dcfce7' :
            org.status === 'pending' ? '#fef3c7' : 
            org.status === 'inactive' ? '#fee2e2' : '#f3f4f6',
          color: 
            org.status === 'active' ? '#166534' :
            org.status === 'pending' ? '#92400e' : 
            org.status === 'inactive' ? '#b91c1c' : '#374151',
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'capitalize'
        }}>
          {org.status || 'Unknown'}
        </div>
      </div>
    ));
  };

  // Render organization details panel
  const renderOrgDetailsPanel = () => {
    if (!selectedOrg) {
      return (
        <div className="empty-details-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '4px',
          border: '1px dashed #d1d5db',
          padding: '24px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <p style={{ marginTop: '16px', textAlign: 'center' }}>
            Select an organization to view its details
          </p>
        </div>
      );
    }

    const primaryColor = selectedOrg.primary_color || '#3b82f6';
    
    return (
      <div className="org-details-panel" style={{
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        height: '100%',
        overflow: 'auto'
      }}>
        <div className="details-header" style={{
          backgroundColor: primaryColor,
          color: 'white',
          padding: '16px',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h3 style={{ 
                margin: 0, 
                fontWeight: 'bold',
              }}>
                {selectedOrg.organization_name}
              </h3>
            </div>
            
            <button 
              onClick={() => setSelectedOrgId(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="details-content" style={{ padding: '16px' }}>
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px' }}>Status:</h4>
            <div style={{ 
              display: 'inline-block',
              padding: '4px 8px',
              backgroundColor: 
                selectedOrg.status === 'active' ? '#dcfce7' :
                selectedOrg.status === 'pending' ? '#fef3c7' : 
                selectedOrg.status === 'inactive' ? '#fee2e2' : '#f3f4f6',
              color: 
                selectedOrg.status === 'active' ? '#166534' :
                selectedOrg.status === 'pending' ? '#92400e' : 
                selectedOrg.status === 'inactive' ? '#b91c1c' : '#374151',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'capitalize',
              marginTop: '4px'
            }}>
              {selectedOrg.status || 'Unknown'}
            </div>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>URL:</h4>
            <a 
              href={`https://${selectedOrg.subdomain}.yourdomain.com`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: primaryColor,
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              {selectedOrg.subdomain}.yourdomain.com
            </a>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Admin:</h4>
            <p>
              {selectedOrg.admin_user ? 
                `${selectedOrg.admin_user.first_name} ${selectedOrg.admin_user.last_name} (${selectedOrg.admin_user.email})` : 
                'No admin assigned'}
            </p>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Created:</h4>
            <p>{selectedOrg.created_at ? new Date(selectedOrg.created_at).toLocaleDateString() : 'Unknown'}</p>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Last Updated:</h4>
            <p>{selectedOrg.updated_at ? new Date(selectedOrg.updated_at).toLocaleDateString() : 'Unknown'}</p>
          </div>
          
          <div className="detail-row">
            <h4 style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '16px' }}>Branding:</h4>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
              <div style={{ marginRight: '16px' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>Primary Color</p>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: selectedOrg.primary_color || '#3b82f6',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }} />
              </div>
              
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>Secondary Color</p>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: selectedOrg.secondary_color || '#9ca3af',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }} />
              </div>
            </div>
          </div>
          
          <div className="detail-row" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button
              onClick={() => alert(`Navigate to ${selectedOrg.organization_name}'s dashboard`)}
              style={{
                flex: 1,
                backgroundColor: primaryColor,
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              View Dashboard
            </button>
            
            <button
              onClick={() => alert(`Edit ${selectedOrg.organization_name}'s settings`)}
              style={{
                flex: 1,
                backgroundColor: 'white',
                color: '#374151',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: '1px solid #d1d5db'
              }}
            >
              Edit Settings
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      {/* Left panel - Organizations list */}
      <div style={{ 
        flex: '1 1 60%', 
        marginRight: '24px',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>White Label Organizations</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => alert('Create new organization functionality would go here')}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              New Organization
            </button>
            <button 
              onClick={fetchOrganizations}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            Loading...
          </div>
        ) : error ? (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#b91c1c',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        ) : (
          <div>{renderOrgList()}</div>
        )}
      </div>
      
      {/* Right panel - Organization details */}
      <div style={{ 
        flex: '1 1 40%', 
        minWidth: '300px',
        maxWidth: '500px'
      }}>
        {renderOrgDetailsPanel()}
      </div>
    </div>
  );
};

export default WhiteLabelOrgList;