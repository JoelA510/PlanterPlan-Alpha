// src/components/Settings/LicenseSection.js
import React, { useEffect } from 'react';
import { useTasks } from '../contexts/TaskContext';

const LicenseSection = () => {
  // Get data and functions from the task context
  const { 
    userLicenses, 
    fetchUserLicenses, 
    canCreateProject, 
    projectLimitReason,
    isCheckingLicense
  } = useTasks();

  // Fetch licenses when component mounts
  useEffect(() => {
    fetchUserLicenses();
  }, [fetchUserLicenses]);

  // Group licenses by status
  const availableLicenses = userLicenses.filter(license => !license.is_used);
  const usedLicenses = userLicenses.filter(license => license.is_used);

  return (
    <div style={{ padding: '16px' }}>
      {isCheckingLicense ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Checking license status...</p>
        </div>
      ) : (
        <>
          <div style={{
            backgroundColor: canCreateProject ? '#d1fae5' : '#fff7ed',
            color: canCreateProject ? '#065f46' : '#c2410c',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '24px'
          }}>
            <p style={{ fontWeight: 'bold' }}>
              {canCreateProject ? 'You can create a new project' : 'Project creation limited'}
            </p>
            <p style={{ marginTop: '4px', fontSize: '14px' }}>
              {projectLimitReason}
            </p>
          </div>
          
          {/* Available Licenses */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                backgroundColor: '#d1fae5',
                color: '#065f46',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                ✓
              </span>
              Available Licenses
            </h3>
            
            {availableLicenses.length === 0 ? (
              <p style={{ color: '#6b7280', padding: '12px 0' }}>
                You don't have any available licenses. Contact your administrator to request licenses.
              </p>
            ) : (
              <ul style={{ 
                backgroundColor: '#f9fafb', 
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                {availableLicenses.map((license, index) => (
                  <li 
                    key={license.id} 
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < availableLicenses.length - 1 ? '1px solid #e5e7eb' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ 
                        fontFamily: 'monospace',
                        backgroundColor: '#e0f2fe',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}>
                        {license.license_key}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                        Added on {new Date(license.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{ 
                      backgroundColor: '#d1fae5',
                      color: '#065f46',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Available
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Used Licenses */}
          <div>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                backgroundColor: '#e0f2fe',
                color: '#1e40af',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                ✓
              </span>
              Used Licenses
            </h3>
            
            {usedLicenses.length === 0 ? (
              <p style={{ color: '#6b7280', padding: '12px 0' }}>
                You haven't used any licenses yet.
              </p>
            ) : (
              <ul style={{ 
                backgroundColor: '#f9fafb', 
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                {usedLicenses.map((license, index) => (
                  <li 
                    key={license.id} 
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < usedLicenses.length - 1 ? '1px solid #e5e7eb' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ 
                        fontFamily: 'monospace',
                        backgroundColor: '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}>
                        {license.license_key}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                        Used on {new Date(license.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{ 
                      backgroundColor: '#e0f2fe',
                      color: '#1e40af',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Used
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LicenseSection;