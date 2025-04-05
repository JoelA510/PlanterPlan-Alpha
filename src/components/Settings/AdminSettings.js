// AdminSettings.js
import React from 'react';

const AdminSettings = () => {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>Admin Settings</h1>
      
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
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#10b981" 
              strokeWidth="2"
              style={{ marginRight: '12px' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
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
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#3b82f6" 
              strokeWidth="2"
              style={{ marginRight: '12px' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
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
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#8b5cf6" 
              strokeWidth="2"
              style={{ marginRight: '12px' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
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
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#ef4444" 
              strokeWidth="2"
              style={{ marginRight: '12px' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
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
};

export default AdminSettings;