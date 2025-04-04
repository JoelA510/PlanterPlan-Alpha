import React, { useState, useEffect } from 'react';
import AppearanceSettings from './AppearanceSettings';

// Mock API function to save settings to the backend
const saveSettingsToAPI = async (settings) => {
  // In a real application, this would make an API call to your backend
  console.log('Saving settings to API:', settings);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return success response
  return { success: true };
};

// Mock API function to fetch current settings
const fetchSettingsFromAPI = async () => {
  // In a real application, this would make an API call to your backend
  console.log('Fetching settings from API');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Return mock settings (or null if no settings exist yet)
  return {
    colors: {
      primary: '#10b981',
      secondary: '#3b82f6',
      tertiary: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937'
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      headingSize: '1.5rem',
      bodySize: '1rem',
      buttonSize: '0.875rem'
    },
    logo: {
      url: '/logo.png',
      altText: 'Task Manager',
      maxHeight: '40px'
    }
  };
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null); // null, 'saving', 'success', 'error'
  
  // Fetch settings on component mount
  useEffect(() => {
    const getSettings = async () => {
      try {
        setLoading(true);
        const fetchedSettings = await fetchSettingsFromAPI();
        setSettings(fetchedSettings);
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getSettings();
  }, []);
  
  // Handle saving settings
  const handleSaveSettings = async (newSettings) => {
    try {
      setSaveStatus('saving');
      const response = await saveSettingsToAPI(newSettings);
      
      if (response.success) {
        setSettings(newSettings);
        setSaveStatus('success');
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setSaveStatus(null);
        }, 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading settings...</p>
      </div>
    );
  }
  
  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '24px'
    }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Settings</h1>
        
        {saveStatus && (
          <div 
            style={{ 
              padding: '12px', 
              borderRadius: '4px', 
              marginTop: '12px',
              backgroundColor: saveStatus === 'success' ? '#dcfce7' : 
                              saveStatus === 'error' ? '#fee2e2' : '#f3f4f6',
              color: saveStatus === 'success' ? '#166534' : 
                    saveStatus === 'error' ? '#b91c1c' : '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>
              {saveStatus === 'success' && '✓ Settings saved successfully!'}
              {saveStatus === 'error' && '✕ Error saving settings. Please try again.'}
              {saveStatus === 'saving' && 'Saving settings...'}
            </span>
            <button 
              onClick={() => setSaveStatus(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
        )}
      </header>
      
      <div style={{ display: 'flex', height: 'calc(100vh - 150px)' }}>
        {/* Settings navigation sidebar */}
        <div style={{ 
          width: '250px', 
          borderRight: '1px solid #e5e7eb',
          paddingRight: '24px',
          marginRight: '24px'
        }}>
          <nav>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setActiveTab('appearance')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '12px',
                    textAlign: 'left',
                    background: activeTab === 'appearance' ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'appearance' ? 'bold' : 'normal',
                    color: activeTab === 'appearance' ? '#10b981' : '#1f2937',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ marginRight: '12px' }}>🎨</span>
                  Appearance
                </button>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setActiveTab('account')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '12px',
                    textAlign: 'left',
                    background: activeTab === 'account' ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'account' ? 'bold' : 'normal',
                    color: activeTab === 'account' ? '#10b981' : '#1f2937'
                  }}
                >
                  <span style={{ marginRight: '12px' }}>👤</span>
                  Account
                </button>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setActiveTab('organization')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '12px',
                    textAlign: 'left',
                    background: activeTab === 'organization' ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'organization' ? 'bold' : 'normal',
                    color: activeTab === 'organization' ? '#10b981' : '#1f2937'
                  }}
                >
                  <span style={{ marginRight: '12px' }}>🏢</span>
                  Organization
                </button>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setActiveTab('notifications')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '12px',
                    textAlign: 'left',
                    background: activeTab === 'notifications' ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'notifications' ? 'bold' : 'normal',
                    color: activeTab === 'notifications' ? '#10b981' : '#1f2937'
                  }}
                >
                  <span style={{ marginRight: '12px' }}>🔔</span>
                  Notifications
                </button>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setActiveTab('integrations')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '12px',
                    textAlign: 'left',
                    background: activeTab === 'integrations' ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'integrations' ? 'bold' : 'normal',
                    color: activeTab === 'integrations' ? '#10b981' : '#1f2937'
                  }}
                >
                  <span style={{ marginRight: '12px' }}>🔌</span>
                  Integrations
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('security')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '12px',
                    textAlign: 'left',
                    background: activeTab === 'security' ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'security' ? 'bold' : 'normal',
                    color: activeTab === 'security' ? '#10b981' : '#1f2937'
                  }}
                >
                  <span style={{ marginRight: '12px' }}>🔒</span>
                  Security
                </button>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Settings content area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'appearance' && (
            <AppearanceSettings 
              initialSettings={settings} 
              saveSettings={handleSaveSettings} 
            />
          )}
          
          {activeTab === 'account' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
                Account Settings
              </h2>
              <p>Account settings would be displayed here.</p>
            </div>
          )}
          
          {activeTab === 'organization' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
                Organization Settings
              </h2>
              <p>Organization settings would be displayed here.</p>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
                Notification Settings
              </h2>
              <p>Notification preferences would be displayed here.</p>
            </div>
          )}
          
          {activeTab === 'integrations' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
                Integrations
              </h2>
              <p>Third-party integrations would be configured here.</p>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
                Security Settings
              </h2>
              <p>Security and privacy settings would be configured here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;