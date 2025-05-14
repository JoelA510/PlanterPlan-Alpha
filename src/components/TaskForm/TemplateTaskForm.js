// src/components/TaskForm/TemplateTaskForm.js
import React from 'react';
import { useTemplateTaskForm } from './useTemplateTaskForm';

const TemplateTaskForm = ({ 
  parentTaskId,
  onSubmit, 
  onCancel, 
  backgroundColor,
  initialData = null,
  isEditing = false
}) => {
  const {
    formData,
    errors,
    handleChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    validateForm,
    prepareFormData,
  } = useTemplateTaskForm(initialData);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const cleanedData = prepareFormData();
      
      onSubmit({
        ...cleanedData,
        parent_task_id: parentTaskId,
        origin: 'template',
        is_complete: formData.is_complete !== undefined ? formData.is_complete : false
      });
    }
  };
  
  const getHeaderText = () => {
    if (isEditing) {
      return 'Edit Template';
    } else if (initialData) {
      return 'Edit Template';
    } else if (!parentTaskId) {
      return 'Add Template';
    } else {
      return 'Add Child Template';
    }
  };
  
  // Safe arrays
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
      {/* Header */}
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
      
      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
        {/* Title Field */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="title"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            Template Title *
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
        
        {/* Duration Field */}
        <div style={{ marginBottom: '16px' }}>
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
        </div>
        
        {/* Parent Task Offset - Only for child templates */}
        {parentTaskId && (
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="days_from_start_until_due"
              style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '4px' 
              }}
            >
              Days After Parent Start
            </label>
            <input
              id="days_from_start_until_due"
              name="days_from_start_until_due"
              type="number"
              min="0"
              value={formData.days_from_start_until_due || 0}
              onChange={handleChange}
              style={{
                width: '80px',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                outline: 'none'
              }}
            />
          </div>
        )}
        
        {/* Purpose Field */}
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
            placeholder="What is the purpose of this template?"
          />
        </div>
        
        {/* Description Field */}
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
            placeholder="Provide detailed description for this template"
          />
        </div>
        
        {/* Actions Field */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
            Actions
          </label>
          {safeActions.map((action, index) => (
            <div key={`action-${index}`} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
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
        
        {/* Resources Field */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
            Resources
          </label>
          {safeResources.map((resource, index) => (
            <div key={`resource-${index}`} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
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
        
        {/* Form Buttons */}
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
            {isEditing || initialData ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateTaskForm;