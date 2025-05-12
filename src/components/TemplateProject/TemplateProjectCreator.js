// src/components/TemplateProject/TemplateProjectCreator.js
import React, { useState, useEffect } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';

const TemplateProjectCreator = ({ onSuccess, onCancel, userHasProjects }) => {
  const { templateTasks, createProjectFromTemplate, applyLicenseKey } = useTasks();
  const { user } = useAuth();
  
  // State for the component
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  
  // Filter to only get top-level templates
  const topLevelTemplates = templateTasks.filter(template => !template.parent_task_id);
  
  // Set default start date to today
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setStartDate(formattedDate);
  }, []);
  
  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    
    // Find the template
    const template = templateTasks.find(t => t.id === templateId);
    
    // Pre-populate the project name based on the template
    if (template) {
      setProjectName(template.title);
    }
  };
  
  // Handle license key change
  const handleLicenseKeyChange = (e) => {
    setLicenseKey(e.target.value);
    setLicenseStatus('');
    setError(null);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!selectedTemplateId) {
      setError('Please select a template');
      return;
    }
    
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }
    
    if (!startDate) {
      setError('Start date is required');
      return;
    }
    
    // If user already has projects, license key is required
    if (userHasProjects && !licenseKey.trim()) {
      setError('License key is required for additional projects');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Variable to store license ID if needed
      let licenseId = null;
  
      // If user already has projects, first apply the license key
      if (userHasProjects) {
        setStatus('Validating license key...');
        const licenseResult = await applyLicenseKey(licenseKey.trim());
        console.log("applyLicenseKey result: ", licenseResult);
  
        if (!licenseResult.success) {
          setLicenseStatus('error');
          throw new Error(licenseResult.error || 'Invalid license key');
        }
        
        // Capture the license ID from the result to pass to createTask
        licenseId = licenseResult.licenseId || licenseResult.id;
        console.log("Using license ID:", licenseId);
        
        setLicenseStatus('success');
        setStatus('License key applied successfully. Creating project...');
      } else {
        setStatus('Creating project from template...');
      }
      
      // Create project data
      const projectData = {
        name: projectName,
        startDate: startDate
      };
      
      // Call the createProjectFromTemplate function from the context
      const result = await createProjectFromTemplate(selectedTemplateId, projectData, licenseId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setStatus('Project created successfully!');
      
      // Call the onSuccess callback with the new project
      if (onSuccess && result.data) {
        onSuccess(result.data);
      }
    } catch (error) {
      console.error('Error creating project from template:', error);
      setStatus('');
      setError(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      height: '100%',
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: '#3b82f6',
        color: 'white',
        padding: '16px',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontWeight: 'bold' }}>
          Create Project from Template
        </h3>
        <button 
          onClick={onCancel}
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
      
      <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
        {/* Template selection */}
        <div style={{ marginBottom: '20px' }}>
          <label 
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '8px' 
            }}
          >
            Select a Template *
          </label>
          
          {topLevelTemplates.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '4px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <p>No templates available. You need to create templates first.</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px'
            }}>
              {topLevelTemplates.map(template => (
                <div 
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  style={{
                    backgroundColor: selectedTemplateId === template.id ? '#3b82f6' : '#f3f4f6',
                    color: selectedTemplateId === template.id ? 'white' : '#374151',
                    padding: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: selectedTemplateId === template.id ? '2px solid #1e40af' : '2px solid transparent',
                    boxShadow: selectedTemplateId === template.id ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{template.title}</div>
                  {template.purpose && (
                    <div style={{ 
                      fontSize: '12px', 
                      opacity: 0.8,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {template.purpose}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* License key input field - only show if user already has projects */}
        {userHasProjects && (
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="licenseKey"
              style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '4px' 
              }}
            >
              License Key *
            </label>
            <div style={{ marginBottom: '8px' }}>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0 0 8px 0' 
              }}>
                You already have a project. A license key is required to create additional projects.
              </p>
            </div>
            <input
              id="licenseKey"
              name="licenseKey"
              type="text"
              value={licenseKey}
              onChange={handleLicenseKeyChange}
              placeholder="Enter your license key"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${error && error.includes('license') ? '#ef4444' : 
                  licenseStatus === 'success' ? '#10b981' : 
                  licenseStatus === 'error' ? '#ef4444' : '#d1d5db'}`,
                outline: 'none',
                backgroundColor: licenseStatus === 'success' ? '#d1fae5' : 'white'
              }}
            />
          </div>
        )}

        {/* Project details */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="projectName"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Project Name *
          </label>
          <input
            id="projectName"
            name="projectName"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${error && error.includes('name') ? '#ef4444' : '#d1d5db'}`,
              outline: 'none'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="startDate"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Start Date *
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${error && error.includes('date') ? '#ef4444' : '#d1d5db'}`,
              outline: 'none'
            }}
          />
        </div>
        
        {error && (
          <div style={{ 
            marginBottom: '16px',
            padding: '8px',
            borderRadius: '4px',
            backgroundColor: '#fee2e2',
            color: '#b91c1c'
          }}>
            {error}
          </div>
        )}
        
        {status && (
          <div style={{ 
            marginBottom: '16px',
            padding: '8px',
            borderRadius: '4px',
            backgroundColor: status.includes('Error') ? '#fee2e2' : 
                            status.includes('License key applied') ? '#d1fae5' :
                            status.includes('Validating') ? '#fff7ed' : '#d1fae5',
            color: status.includes('Error') ? '#b91c1c' : 
                   status.includes('License key applied') ? '#065f46' :
                   status.includes('Validating') ? '#c2410c' : '#065f46'
          }}>
            {status}
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || topLevelTemplates.length === 0}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              background: '#10b981',
              color: 'white',
              cursor: (isSubmitting || topLevelTemplates.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || topLevelTemplates.length === 0) ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateProjectCreator;