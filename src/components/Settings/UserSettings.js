// UserSettings.js
import React from 'react';
import LicenseSection from './LicenseSection'; // Import the LicenseSection component

const UserSettings = () => {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>User Settings</h1>
      
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        padding: '32px',
        marginBottom: '32px',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="64" 
          height="64" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth="1"
          style={{ display: 'inline-block', marginBottom: '16px' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>User Settings</h2>
        <p>Manage your profile, notification preferences, and licenses.</p>
      </div>
      
      {/* Profile Information Section */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '4px',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Profile Information</h3>
        </div>
        <div style={{ padding: '16px' }}>
          <p style={{ color: '#6b7280' }}>User profile settings would appear here.</p>
        </div>
      </div>
      
      {/* Notification Preferences Section */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '4px',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Notification Preferences</h3>
        </div>
        <div style={{ padding: '16px' }}>
          <p style={{ color: '#6b7280' }}>Notification settings would appear here.</p>
        </div>
      </div>
      
      {/* License Management Section */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>License Management</h3>
        </div>
        <LicenseSection />
      </div>
    </div>
  );
};

export default UserSettings;