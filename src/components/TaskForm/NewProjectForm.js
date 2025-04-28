// src/components/ProjectCreation/NewProjectForm.js
import React, { useState, useEffect } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import LicenseKeyEntry from '../License/LicenseKeyEntry';
import { useTaskForm } from '../TaskForm/useTaskForm';

const NewProjectForm = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { 
    canCreateProject, 
    projectLimitReason, 
    checkProjectCreationAbility,
    userLicenses,
    selectedLicenseId,
    selectLicense,
    createTask
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
  
  const [showLicenseInput, setShowLicenseInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  
  // Get available (unused) licenses
  const availableLicenses = userLicenses.filter(license => !license.is_used);
  
  useEffect(() => {
    // Show license input if user needs to apply a license to create a project
    if (!canCreateProject && projectLimitReason.includes('maximum number of projects')) {
      setShowLicenseInput(true);
    } else {
      setShowLicenseInput(false);
    }
  }, [canCreateProject, projectLimitReason]);
  
  const handleLicenseChange = (e) => {
    selectLicense(e.target.value);
    
    // Clear license error if it exists
    if (errors.license) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.license;
        return newErrors;
      });
    }
  };
  
  const handleLicenseSuccess = () => {
    setShowLicenseInput(false);
    // Call checkProjectCreationAbility instead of refreshProjectCreationStatus
    checkProjectCreationAbility();
  };
  
  // Custom validation to include license validation
  const validateWithLicense = (formData) => {
    const additionalErrors = {};
    
    // If the user already has projects and needs to select a license
    if (!canCreateProject && availableLicenses.length > 0 && !selectedLicenseId) {
      additionalErrors.license = 'Please select a license to create an additional project';
    }
    
    return additionalErrors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm(validateWithLicense)) {
      return;
    }
    
    setIsSubmitting(true);
    setStatus('Creating project...');
    
    try {
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
      
      const result = await createTask(taskData, selectedLicenseId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setStatus('Project created successfully!');
      
      // Refresh the project creation status
      await checkProjectCreationAbility();
      
      // Reset selected license
      selectLicense(null);
      
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
  
  // If we need to show the license key entry form
  if (showLicenseInput) {
    return (
      <LicenseKeyEntry 
        onSuccess={handleLicenseSuccess}
        onCancel={onCancel}
      />
    );
  }
  
  // If user can't create a project and doesn't have any available licenses
  if (!canCreateProject && availableLicenses.length === 0) {
    return (
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#374151' }}>
          Project Creation Limit Reached
        </h3>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          {projectLimitReason}
        </p>
        <button
          onClick={() => setShowLicenseInput(true)}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            border: 'none'
          }}
        >
          Enter License Key
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            background: 'white',
            marginLeft: '12px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    );
  }
  
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
        
        {/* License Selection if needed */}
        {!canCreateProject && availableLicenses.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="license"
              style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '4px' 
              }}
            >
              License Key for This Project *
            </label>
            <select
              id="license"
              value={selectedLicenseId || ''}
              onChange={handleLicenseChange}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${errors.license ? '#ef4444' : '#d1d5db'}`,
                outline: 'none'
              }}
            >
              <option value="">Select a license</option>
              {availableLicenses.map(license => (
                <option key={license.id} value={license.id}>
                  {license.license_key}
                </option>
              ))}
            </select>
            {errors.license && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.license}
              </p>
            )}
          </div>
        )}
        
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
            backgroundColor: status.includes('Error') ? '#fee2e2' : '#d1fae5',
            color: status.includes('Error') ? '#b91c1c' : '#065f46'
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