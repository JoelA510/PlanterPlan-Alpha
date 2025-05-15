// In TemplateTaskForm.js - Simplify by removing toggle functionality

import React, { useState, useEffect } from 'react';
import { useTemplateTaskForm } from './useTemplateTaskForm';
import { calculateParentDuration } from '../../utils/sequentialTaskManager';

const TemplateTaskForm = ({ 
  parentTaskId,
  onSubmit, 
  onCancel, 
  backgroundColor,
  initialData = null,
  isEditing = false,
  tasks = []
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
  
  // State for tracking if this template has children
  const [hasChildren, setHasChildren] = useState(false);
  const [minRequiredDuration, setMinRequiredDuration] = useState(1);
  
  // Check if this is a task with children (for editing mode)
  useEffect(() => {
    if (isEditing && initialData && initialData.id && Array.isArray(tasks)) {
      // Check if the task has children
      const childExists = tasks.some(task => task.parent_task_id === initialData.id);
      setHasChildren(childExists);
      
      if (childExists) {
        // Calculate the minimum duration required based on children
        const calculatedDuration = calculateParentDuration(initialData.id, tasks);
        setMinRequiredDuration(calculatedDuration);
      }
    }
  }, [isEditing, initialData, tasks]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const cleanedData = prepareFormData();
      
      // If this task has children, inform the user that the duration will be auto-calculated
      if (hasChildren && cleanedData.duration_days < minRequiredDuration) {
        alert(`This template has child tasks that require at least ${minRequiredDuration} days. The duration value you've set will be stored, but the template will display with the calculated duration based on its children.`);
      }
      
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              days
            </span>
          </div>
          
          {/* Show helper text if this is a parent template with children */}
          {hasChildren && (
            <p style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              margin: '4px 0 0 0',
              fontStyle: 'italic'
            }}>
              {`Note: This template has children that require at least ${minRequiredDuration} days. The displayed duration will be auto-calculated.`}
            </p>
          )}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                days
              </span>
            </div>
            <p style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              margin: '4px 0 0 0',
              fontStyle: 'italic'
            }}>
              Tasks are sequenced in order by position
            </p>
          </div>
        )}
        
        {/* Rest of form fields remain the same */}
        {/* ... */}
        
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