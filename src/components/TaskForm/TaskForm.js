// This is the updated TaskForm component with URL detection for resources and Master Library search
// src/components/TaskForm/TaskForm.js

import React, { useState, useRef } from 'react';
import { useTaskForm } from './useTaskForm';
import { formatDisplayDate } from '../../utils/taskUtils';
import URLTextComponent from '../URLTextComponent'; // Import the URL component
import MasterLibraryPopup from './MasterLibraryPopup'; // Import the popup component

const TaskForm = ({ 
  parentTaskId,
  parentStartDate,
  onSubmit, 
  onCancel, 
  backgroundColor,
  originType = 'instance', // Default to template, but can be overridden
  initialData = null, // For editing existing tasks
  isEditing = false  // Flag to indicate we're editing
}) => {
  // Master Library popup state
  const [showMasterLibraryPopup, setShowMasterLibraryPopup] = useState(false);
  const formRef = useRef(null);

  const {
    formData,
    errors,
    dateMode,
    handleDateModeChange,
    handleChange,
    handleDateChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    validateForm,
    prepareFormData,
    setFormData // We need this to update form data from copied template
  } = useTaskForm(initialData, parentStartDate);

  // Handle copying a master library task to the form
  const handleCopyMasterLibraryTask = (templateTask) => {
    console.log('Copying master library task to form:', templateTask);
    
    // Parse array fields safely
    const parseArrayField = (field) => {
      if (Array.isArray(field)) return field.length > 0 ? field : [''];
      if (!field) return [''];
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? (parsed.length > 0 ? parsed : ['']) : [field];
        } catch (e) {
          return [field];
        }
      }
      return [''];
    };

    // Update form data with template data, preserving existing dates and parent info
    setFormData(prev => ({
      ...prev,
      // Copy template content
      title: templateTask.title || prev.title,
      purpose: templateTask.purpose || prev.purpose,
      description: templateTask.description || prev.description,
      actions: parseArrayField(templateTask.actions),
      resources: parseArrayField(templateTask.resources),
      // Use template duration but preserve form's date calculations
      duration_days: templateTask.default_duration || templateTask.duration_days || prev.duration_days,
      // Keep existing parent relationship and dates
      parent_task_id: prev.parent_task_id,
      start_date: prev.start_date,
      due_date: prev.due_date,
      days_from_start_until_due: prev.days_from_start_until_due
    }));

    setShowMasterLibraryPopup(false);
    
    // Show success message
    console.log('✅ Master library task copied successfully');
  };

  // Get form position for popup positioning
  const getFormPosition = () => {
    if (formRef.current) {
      const rect = formRef.current.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left
      };
    }
    return { top: 100, left: 500 };
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const cleanedData = prepareFormData();
      
      onSubmit({
        ...cleanedData,
        parent_task_id: parentTaskId,
        origin: originType,
        is_complete: formData.is_complete !== undefined ? formData.is_complete : false
      });
    }
  };
  
  // Determine the header text based on origin type and whether we're editing
  const getHeaderText = () => {
    if (isEditing) {
      return 'Edit Task';
    } else if (initialData) {
      return 'Edit Task';
    } else if (!parentTaskId) {
      return originType === 'template' ? 'Add Template' : 'Add Project';
    } else {
      return originType === 'template' ? 'Add Template Task' : 'Add Subtask';
    }
  };
  
  // IMPORTANT: Safeguard arrays to prevent mapping errors
  // These are fallbacks in case formData has issues
  const safeActions = Array.isArray(formData.actions) ? formData.actions : [];
  const safeResources = Array.isArray(formData.resources) ? formData.resources : [];
  
  return (
    <>
      <div 
        ref={formRef}
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          height: '100%',
          overflow: 'auto'
        }}
      >
        <div style={{
          backgroundColor: backgroundColor,
          color: 'white',
          padding: '16px',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontWeight: 'bold' }}>
            {getHeaderText()}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Master Library Search Button */}
            <button
              type="button"
              onClick={() => setShowMasterLibraryPopup(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              title="Search Master Library templates to copy"
            >
              <span>🔍</span>
              <span>Copy from Library</span>
            </button>
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
              Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title || ''}
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
          
          {/* Simplified schedule section - only duration for instance tasks */}
          <div style={{ 
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
          }}>
            
            {/* Only show duration field */}
            <div style={{ marginBottom: '12px' }}>
              <label 
                htmlFor="duration_days"
                style={{ 
                  display: 'block', 
                  fontWeight: 'bold', 
                  marginBottom: '4px'
                }}
              >
                Duration (days)
              </label>
              <input
                id="duration_days"
                name="duration_days"
                type="number"
                min="1"
                value={formData.duration_days || 1}
                onChange={handleChange}
                style={{
                  width: '80px',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  outline: 'none'
                }}
              />
              
              {/* Display the current date range (read-only) */}
              {formData.start_date && formData.due_date && (
                <div style={{ 
                  marginTop: '12px', 
                  fontSize: '14px', 
                  color: '#4b5563',
                  backgroundColor: '#f9fafb',
                  padding: '8px',
                  borderRadius: '4px' 
                }}>
                  <div><strong>Start Date:</strong> {formatDisplayDate(formData.start_date)}</div>
                  <div><strong>End Date:</strong> {formatDisplayDate(formData.due_date)}</div>
                  <div style={{ marginTop: '4px', fontSize: '12px', fontStyle: 'italic' }}>
                    Note: Changing duration will update the end date accordingly.
                  </div>
                </div>
              )}
            </div>
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
              value={formData.purpose || ''}
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
              value={formData.description || ''}
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
            {safeActions.map((action, index) => (
              <div key={`action-${index}`} style={{ 
                display: 'flex', 
                marginBottom: '8px',
                alignItems: 'center' 
              }}>
                <input
                  type="text"
                  value={action || ''}
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
          
          {/* ✅ UPDATED: Resources section with URL detection */}
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
            {safeResources.map((resource, index) => (
              <div key={`resource-${index}`} style={{ 
                display: 'flex', 
                marginBottom: '8px',
                alignItems: 'flex-start' 
              }}>
                <URLTextComponent
                  value={resource || ''}
                  onChange={(newValue) => handleArrayChange('resources', index, newValue)}
                  placeholder="Enter a resource (URLs will be automatically detected)"
                  style={{
                    flex: 1,
                    marginRight: '8px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('resources', index)}
                  style={{
                    marginTop: '8px',
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
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                background: '#10b981',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {isEditing || initialData ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Master Library Popup */}
      <MasterLibraryPopup
        isOpen={showMasterLibraryPopup}
        onClose={() => setShowMasterLibraryPopup(false)}
        onCopyTask={handleCopyMasterLibraryTask}
        position={getFormPosition()}
      />
    </>
  );
};

export default TaskForm;