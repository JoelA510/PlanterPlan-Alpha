import React, { useState } from 'react';
import { useOrganization } from '../contexts/OrganizationProvider';
import AppearanceSettings from './AppearanceSettings';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const { organization } = useOrganization();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceSettings />;
      
      default: // 'general' and any other tab
        return (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '20px' }}>
              General Settings
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {/* Organization Settings */}
              <div style={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '4px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    marginRight: '12px',
                    color: '#10b981'
                  }}>🏢</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Organization</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>Manage organization settings, branding, and domains.</p>
                <button style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: '#4b5563',
                  fontWeight: '500'
                }}>
                  Manage
                </button>
              </div>
              
              {/* User Management */}
              <div style={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '4px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    marginRight: '12px',
                    color: '#3b82f6'
                  }}>👥</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Users</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>Manage users, permissions, and teams.</p>
                <button style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: '#4b5563',
                  fontWeight: '500'
                }}>
                  Manage
                </button>
              </div>
              
              {/* Template Management */}
              <div style={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '4px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    marginRight: '12px',
                    color: '#8b5cf6'
                  }}>📄</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Templates</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>Manage task templates and project blueprints.</p>
                <button style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: '#4b5563',
                  fontWeight: '500'
                }}>
                  Manage
                </button>
              </div>
              
              {/* Billing & Subscription */}
              <div style={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '4px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    marginRight: '12px',
                    color: '#ef4444'
                  }}>💳</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Billing</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>Manage subscription, billing information, and usage.</p>
                <button style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: '#4b5563',
                  fontWeight: '500'
                }}>
                  Manage
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
        Admin Settings {organization ? `for ${organization.organization_name}` : ''}
      </h1>
      
      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              padding: '8px 16px',
              borderBottom: activeTab === 'general' ? '2px solid #10b981' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'general' ? '#10b981' : '#6b7280',
              fontWeight: activeTab === 'general' ? '600' : '400',
              cursor: 'pointer',
              border: 'none',
              outline: 'none'
            }}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            style={{
              padding: '8px 16px',
              borderBottom: activeTab === 'appearance' ? '2px solid #10b981' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'appearance' ? '#10b981' : '#6b7280',
              fontWeight: activeTab === 'appearance' ? '600' : '400',
              cursor: 'pointer',
              border: 'none',
              outline: 'none'
            }}
          >
            Appearance
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default AdminSettings;