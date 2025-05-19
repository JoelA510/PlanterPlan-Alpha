// This is the updated TaskForm component with date mode selection
// src/components/TaskForm/TaskForm.js

import React from 'react';
import { useTaskForm } from './useTaskForm';
import { formatDisplayDate } from '../../utils/taskUtils';

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
    prepareFormData
  } = useTaskForm(initialData, parentStartDate);
  
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
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      height: '100%',
      overflow: 'auto'
    }}>
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
              alignItems: 'center' 
            }}>
              <input
                type="text"
                value={resource || ''}
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
  );
};

export default TaskForm;