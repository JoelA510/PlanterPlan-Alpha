// src/components/ProjectCreation/NewProjectForm.js
import React, { useState } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { useTaskForm } from '../TaskForm/useTaskForm';

const NewProjectForm = ({ onSuccess, onCancel, userHasProjects }) => {
  const { user } = useAuth();
  const { 
    createTask,
    applyLicenseKey
  } = useTasks();
  
  const {
    formData,
    errors,
    setErrors,
    handleChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    validateForm,
    prepareFormData
  } = useTaskForm();
  
  // Add state for license key
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  // const [licenseId, setLicenseId] = useState(null);

  // Handle license key change
  const handleLicenseKeyChange = (e) => {
    setLicenseKey(e.target.value);
    // Clear license error if it exists
    if (errors.licenseKey) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.licenseKey;
        return newErrors;
      });
    }
    // Clear license status
    setLicenseStatus('');
  };

  // Custom validation to include license key validation when required
  const validateProjectForm = (formData) => {
    const additionalErrors = {};
    
    // If user already has projects, license key is required
    if (userHasProjects && !licenseKey.trim()) {
      additionalErrors.licenseKey = 'License key is required for additional projects';
    }
    
    return additionalErrors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm(validateProjectForm)) {
      return;
    }
    
    setIsSubmitting(true);
    
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
        setStatus('Creating project...');
      }
      
      const cleanedData = prepareFormData();
      
      // Create the project
      const taskData = {
        ...cleanedData,
        origin: 'instance',
        is_complete: false,
        creator: user.id,
        position: 0,
        parent_task_id: null // Ensure it's a top-level project
      };
  
      // Pass the license ID to the createTask function
      const result = await createTask(taskData, licenseId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setStatus('Project created successfully!');
      
      // Call the onSuccess callback
      if (onSuccess && result.data) {
        onSuccess(result.data);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Regular form for creating a project
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
          Create New Project
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
                border: `1px solid ${errors.licenseKey ? '#ef4444' : 
                  licenseStatus === 'success' ? '#10b981' : 
                  licenseStatus === 'error' ? '#ef4444' : '#d1d5db'}`,
                outline: 'none',
                backgroundColor: licenseStatus === 'success' ? '#d1fae5' : 'white'
              }}
            />
            {errors.licenseKey && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.licenseKey}
              </p>
            )}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="title"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Project Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${errors.title ? '#ef4444' : '#d1d5db'}`,
              outline: 'none'
            }}
          />
          {errors.title && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.title}
            </p>
          )}
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="purpose"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Purpose
          </label>
          <textarea
            id="purpose"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            rows={2}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="description"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>
        
        {/* Actions array input */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Actions
          </label>
          {formData.actions.map((action, index) => (
            <div key={`action-${index}`} style={{ 
              display: 'flex', 
              marginBottom: '8px',
              alignItems: 'center' 
            }}>
              <input
                type="text"
                value={action}
                onChange={(e) => handleArrayChange('actions', index, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  outline: 'none'
                }}
                placeholder="Enter an action step"
              />
              <button
                type="button"
                onClick={() => removeArrayItem('actions', index)}
                style={{
                  marginLeft: '8px',
                  padding: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#f3f4f6',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('actions')}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px'
            }}
          >
            <span style={{ marginRight: '4px' }}>Add Action</span>
            <span>+</span>
          </button>
        </div>
        
        {/* Resources array input */}
        <div style={{ marginBottom: '24px' }}>
          <label 
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Resources
          </label>
          {formData.resources.map((resource, index) => (
            <div key={`resource-${index}`} style={{ 
              display: 'flex', 
              marginBottom: '8px',
              alignItems: 'center' 
            }}>
              <input
                type="text"
                value={resource}
                onChange={(e) => handleArrayChange('resources', index, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  outline: 'none'
                }}
                placeholder="Enter a resource"
              />
              <button
                type="button"
                onClick={() => removeArrayItem('resources', index)}
                style={{
                  marginLeft: '8px',
                  padding: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#f3f4f6',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('resources')}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px'
            }}
          >
            <span style={{ marginRight: '4px' }}>Add Resource</span>
            <span>+</span>
          </button>
        </div>
        
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
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              background: '#10b981',
              color: 'white',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewProjectForm;