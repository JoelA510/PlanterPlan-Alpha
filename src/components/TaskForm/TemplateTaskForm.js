// src/components/TaskForm/TemplateTaskForm.js
import React, { useState, useEffect } from 'react';
import { calculateParentDuration } from '../../utils/sequentialTaskManager';

const TemplateTaskForm = ({ 
  parentTaskId,  // Now always required - never null
  onSubmit, 
  onCancel, 
  backgroundColor,
  initialData = null,
  isEditing = false,
  tasks = []
}) => {
  // ✅ FIXED: Process initialData to map fields correctly
  const processInitialData = (data) => {
    if (!data) return {};
    
    return {
      title: data.title || '',
      purpose: data.purpose || '',
      description: data.description || '',
      actions: Array.isArray(data.actions) ? data.actions : [''],
      resources: Array.isArray(data.resources) ? data.resources : [''],
      // ✅ Map default_duration to duration_days for the form
      duration_days: data.default_duration || data.duration_days || 1,
      days_from_start_until_due: data.days_from_start_until_due || 0,
    };
  };

  // ✅ FIXED: Use processed initial data
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    description: '',
    actions: [''],
    resources: [''],
    duration_days: 1,
    days_from_start_until_due: 0,
    ...processInitialData(initialData)  // ✅ Use processed data
  });
  
  // ✅ ADD: Debug log to see what's being populated
  useEffect(() => {
    if (initialData) {
      console.log('🐛 TemplateTaskForm received initialData:', initialData);
      console.log('🐛 Processed form data:', processInitialData(initialData));
      
      // ✅ Update form data when initialData changes
      setFormData(prev => ({
        ...prev,
        ...processInitialData(initialData)
      }));
    }
  }, [initialData]);
  
  const [errors, setErrors] = useState({});
  const [hasChildren, setHasChildren] = useState(false);
  const [minRequiredDuration, setMinRequiredDuration] = useState(1);
  
  // Check if this is a task with children (for editing mode)
  useEffect(() => {
    if (isEditing && initialData && initialData.id && Array.isArray(tasks)) {
      const childExists = tasks.some(task => task.parent_task_id === initialData.id);
      setHasChildren(childExists);
      
      if (childExists) {
        const calculatedDuration = calculateParentDuration(initialData.id, tasks);
        setMinRequiredDuration(calculatedDuration);
      }
    }
  }, [isEditing, initialData, tasks]);

  // Handle basic input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle array field changes
  const handleArrayChange = (type, index, value) => {
    setFormData(prev => {
      const currentArray = Array.isArray(prev[type]) ? prev[type] : [''];
      const newArray = [...currentArray];
      newArray[index] = value;
      return {
        ...prev,
        [type]: newArray
      };
    });
  };

  // Add new array item
  const addArrayItem = (type) => {
    setFormData(prev => {
      const currentArray = Array.isArray(prev[type]) ? prev[type] : [''];
      return {
        ...prev,
        [type]: [...currentArray, '']
      };
    });
  };

  // Remove array item
  const removeArrayItem = (type, index) => {
    setFormData(prev => {
      const currentArray = Array.isArray(prev[type]) ? prev[type] : [''];
      const newArray = [...currentArray];
      newArray.splice(index, 1);
      return {
        ...prev,
        [type]: newArray.length === 0 ? [''] : newArray
      };
    });
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.duration_days || formData.duration_days < 1) {
      newErrors.duration_days = 'Duration must be at least 1 day';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Prepare data for submission
  const prepareFormData = () => {
    return {
      ...formData,
      actions: Array.isArray(formData.actions) 
        ? formData.actions.filter(item => item && item.trim() !== '') 
        : [],
      resources: Array.isArray(formData.resources) 
        ? formData.resources.filter(item => item && item.trim() !== '') 
        : [],
      duration_days: parseInt(formData.duration_days, 10),
      days_from_start_until_due: parseInt(formData.days_from_start_until_due || 0, 10),
      parent_task_id: parentTaskId,
      origin: 'template',
      is_complete: formData.is_complete !== undefined ? formData.is_complete : false
    };
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const cleanedData = prepareFormData();
      
      // If this task has children, inform the user about duration calculation
      if (hasChildren && cleanedData.duration_days < minRequiredDuration) {
        alert(`This template has child tasks that require at least ${minRequiredDuration} days. The duration value you've set will be stored, but the template will display with the calculated duration based on its children.`);
      }
      
      onSubmit(cleanedData);
    }
  };
  
  // Simplified header text - always for child templates
  const getHeaderText = () => {
    if (isEditing) {
      return 'Edit Template';
    }
    return 'Add Child Template';  // Simplified since parentTaskId is always present
  };
  
  // Safe arrays
  const safeActions = Array.isArray(formData.actions) ? formData.actions : [''];
  const safeResources = Array.isArray(formData.resources) ? formData.resources : [''];
  
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
                border: `1px solid ${errors.duration_days ? '#ef4444' : '#d1d5db'}`,
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '14px', color: '#6b7280' }}>days</span>
          </div>
          
          {/* Show helper text if this is a parent template with children */}
          {hasChildren && (
            <p style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              margin: '4px 0 0 0',
              fontStyle: 'italic'
            }}>
              Note: This template has children that require at least {minRequiredDuration} days. The displayed duration will be auto-calculated.
            </p>
          )}
          
          {errors.duration_days && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.duration_days}
            </p>
          )}
        </div>
        
        
        
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
          />
        </div>
        
        {/* Actions Array */}
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
        
        {/* Resources Array */}
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
            {isEditing ? 'Update Template' : 'Add Child Template'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateTaskForm;