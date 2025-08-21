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
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const processInitialData = (data) => {
    if (!data) return {};
    
    return {
      title: data.title || '',
      purpose: data.purpose || '',
      description: data.description || '',
      actions: Array.isArray(data.actions) ? data.actions : [''],
      resources: Array.isArray(data.resources) ? data.resources : [''],
      duration_days: data.default_duration || data.duration_days || 1,
      days_from_start_until_due: data.days_from_start_until_due || 0,
    };
  };

  const getHeaderText = () => {
    if (isEditing) {
      return 'Edit Template Task';
    }
    return 'Add Child Template Task';
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    description: '',
    actions: [''],
    resources: [''],
    duration_days: 1,
    days_from_start_until_due: 0,
    ...processInitialData(initialData)
  });
  
  const [errors, setErrors] = useState({});
  const [hasChildren, setHasChildren] = useState(false);
  const [minRequiredDuration, setMinRequiredDuration] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Handle initial data changes (for copy mode)
  useEffect(() => {
    if (initialData) {
      console.log('🐛 TemplateTaskForm received initialData:', initialData);
      console.log('🐛 Processed form data:', processInitialData(initialData));
      
      setFormData(prev => ({
        ...prev,
        ...processInitialData(initialData)
      }));
    }
  }, [initialData]);
  
  // Check for children and calculate minimum duration (for editing mode)
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

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error and submit error when user makes changes
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
    
    if (submitError) {
      setSubmitError(null);
    }
  };

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
    
    if (submitError) {
      setSubmitError(null);
    }
  };

  const addArrayItem = (type) => {
    setFormData(prev => {
      const currentArray = Array.isArray(prev[type]) ? prev[type] : [''];
      return {
        ...prev,
        [type]: [...currentArray, '']
      };
    });
  };

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

  // ============================================================================
  // FORM LOGIC
  // ============================================================================
  
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    const cleanedData = prepareFormData();
    
    // Warn about duration calculation if needed
    if (hasChildren && cleanedData.duration_days < minRequiredDuration) {
      alert(`This template has child tasks that require at least ${minRequiredDuration} days. The duration value you've set will be stored, but the template will display with the calculated duration based on its children.`);
    }
    
    try {
      const result = await onSubmit(cleanedData);
      
      if (result?.error) {
        setSubmitError(result.error);
        return; // Keep form open on error
      }
      
      // Success - parent will handle closing the form
      
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const safeActions = Array.isArray(formData.actions) ? formData.actions : [''];
  const safeResources = Array.isArray(formData.resources) ? formData.resources : [''];

  // ============================================================================
  // RENDER COMPONENTS
  // ============================================================================
  
  const renderErrorMessage = () => {
    if (!submitError) return null;
    
    return (
      <div className="bg-red-50 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
        {submitError}
      </div>
    );
  };

  const renderTitleField = () => (
    <div>
      <label htmlFor="title" className="block font-bold mb-1 text-gray-900">
        Template Title *
      </label>
      <input
        id="title"
        name="title"
        type="text"
        value={formData.title || ''}
        onChange={handleChange}
        disabled={isSubmitting}
        className={`
          w-full px-2 py-2 rounded border outline-none transition-all
          ${errors.title 
            ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-200' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
          }
          ${isSubmitting ? 'opacity-60 bg-gray-100' : 'bg-white'}
        `}
        placeholder="Enter template title"
      />
      {errors.title && (
        <p className="text-red-500 text-xs mt-1">{errors.title}</p>
      )}
    </div>
  );

  const renderDurationField = () => (
    <div>
      <label htmlFor="duration_days" className="block font-bold mb-1 text-gray-900">
        Duration (days)
      </label>
      <div className="flex items-center gap-2">
        <input
          id="duration_days"
          name="duration_days"
          type="number"
          min="1"
          value={formData.duration_days || 1}
          onChange={handleChange}
          disabled={isSubmitting}
          className={`
            w-20 px-2 py-2 rounded border outline-none transition-all
            ${errors.duration_days 
              ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-200' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
            }
            ${isSubmitting ? 'opacity-60 bg-gray-100' : 'bg-white'}
          `}
        />
        <span className="text-sm text-gray-500">days</span>
      </div>
      
      {hasChildren && (
        <p className="text-xs text-gray-500 mt-1 italic">
          Note: This template has children that require at least {minRequiredDuration} days. 
          The displayed duration will be auto-calculated.
        </p>
      )}
      
      {errors.duration_days && (
        <p className="text-red-500 text-xs mt-1">{errors.duration_days}</p>
      )}
    </div>
  );

  const renderTextAreaField = (name, label, rows = 2, placeholder = '') => (
    <div>
      <label htmlFor={name} className="block font-bold mb-1 text-gray-900">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        disabled={isSubmitting}
        rows={rows}
        className={`
          w-full px-2 py-2 rounded border border-gray-300 outline-none resize-y transition-all
          focus:border-blue-500 focus:ring-1 focus:ring-blue-200
          ${isSubmitting ? 'opacity-60 bg-gray-100' : 'bg-white'}
        `}
        placeholder={placeholder}
      />
    </div>
  );

  const renderArrayField = (type, label, placeholder) => (
    <div>
      <label className="block font-bold mb-1 text-gray-900">{label}</label>
      <div className="space-y-2">
        {(type === 'actions' ? safeActions : safeResources).map((item, index) => (
          <div key={`${type}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={item || ''}
              onChange={(e) => handleArrayChange(type, index, e.target.value)}
              disabled={isSubmitting}
              className={`
                flex-1 px-2 py-2 rounded border border-gray-300 outline-none transition-all
                focus:border-blue-500 focus:ring-1 focus:ring-blue-200
                ${isSubmitting ? 'opacity-60 bg-gray-100' : 'bg-white'}
              `}
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => removeArrayItem(type, index)}
              disabled={isSubmitting}
              className={`
                px-2 py-2 rounded border-none bg-gray-100 text-gray-600 transition-all
                ${isSubmitting 
                  ? 'cursor-not-allowed opacity-60' 
                  : 'cursor-pointer hover:bg-gray-200'
                }
              `}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem(type)}
          disabled={isSubmitting}
          className={`
            px-2 py-1 rounded border border-gray-300 bg-white flex items-center text-xs gap-1 transition-all
            ${isSubmitting 
              ? 'cursor-not-allowed opacity-60' 
              : 'cursor-pointer hover:bg-gray-50 hover:border-gray-400'
            }
          `}
        >
          <span>Add {label.slice(0, -1)}</span>
          <span>+</span>
        </button>
      </div>
    </div>
  );

  const renderFormButtons = () => (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className={`
          px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 transition-all
          ${isSubmitting 
            ? 'cursor-not-allowed opacity-60' 
            : 'cursor-pointer hover:bg-gray-50 hover:border-gray-400'
          }
        `}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className={`
          px-4 py-2 rounded border-none text-white flex items-center gap-2 transition-all
          ${isSubmitting 
            ? 'bg-gray-500 cursor-not-allowed' 
            : 'bg-green-600 cursor-pointer hover:bg-green-700'
          }
        `}
      >
        {isSubmitting && (
          <div className="w-4 h-4 border-2 border-white border-opacity-30 border-t-white rounded-full animate-spin" />
        )}
        {isSubmitting 
          ? (isEditing ? 'Updating...' : 'Adding...') 
          : (isEditing ? 'Update Template' : 'Add Child Template Task')
        }
      </button>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div className="bg-gray-50 rounded border border-gray-200 h-full overflow-auto">
      {/* Header */}
      <div 
        className="text-white p-4 rounded-t flex justify-between items-center"
        style={{ backgroundColor: backgroundColor }}
      >
        <h3 className="m-0 font-bold">{getHeaderText()}</h3>
        <button 
          onClick={onCancel}
          disabled={isSubmitting}
          className={`
            bg-white bg-opacity-20 border-none rounded-full text-white w-6 h-6 
            flex items-center justify-center text-xs transition-opacity
            ${isSubmitting 
              ? 'cursor-not-allowed opacity-60' 
              : 'cursor-pointer hover:bg-opacity-30'
            }
          `}
        >
          ✕
        </button>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {renderErrorMessage()}
        {renderTitleField()}
        {renderDurationField()}
        {renderTextAreaField('purpose', 'Purpose', 2, 'What is this template for?')}
        {renderTextAreaField('description', 'Description', 3, 'Describe this template')}
        {renderArrayField('actions', 'Actions', 'Enter an action step')}
        {renderArrayField('resources', 'Resources', 'Enter a resource')}
        {renderFormButtons()}
      </form>
    </div>
  );
};

export default TemplateTaskForm;