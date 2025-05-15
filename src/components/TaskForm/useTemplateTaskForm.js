// src/components/TaskForm/useTemplateTaskForm.js
import { useState, useEffect } from 'react';

/**
 * Custom hook specifically for handling template task forms
 * @param {Object} initialData - Initial form data values
 * @returns {Object} Form state and handlers
 */
export const useTemplateTaskForm = (initialData = {}) => {
  // Helper function to ensure array fields are properly formatted
  const ensureArray = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value : [''];
    }
    
    if (value === undefined || value === null) {
      return [''];
    }
    
    // If it's a string, try to parse it as JSON (it might be a serialized array)
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed.length > 0 ? parsed : ['']) : [value];
      } catch (e) {
        // If parsing fails, treat it as a single item array
        return [value];
      }
    }
    
    // For any other value, wrap it in an array
    return [value];
  };
  
  // Process initialData to ensure arrays are properly formatted
  const processedInitialData = { ...initialData };
  
  // Ensure actions and resources are arrays
  if (initialData) {
    try {
      processedInitialData.actions = ensureArray(initialData.actions);
      processedInitialData.resources = ensureArray(initialData.resources);
    } catch (e) {
      console.error('Error processing arrays:', e);
      processedInitialData.actions = [''];
      processedInitialData.resources = [''];
    }
  }
  
  // Set default values with any processed initialData
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    description: '',
    actions: [''],
    resources: [''],
    duration_days: 1,
    ...processedInitialData
  });
  
  const [errors, setErrors] = useState({});
  
  // Force actions and resources to be arrays in case they weren't properly converted
  useEffect(() => {
    const updatedData = { ...formData };
    let needsUpdate = false;
    
    if (!Array.isArray(updatedData.actions)) {
      updatedData.actions = ensureArray(updatedData.actions);
      needsUpdate = true;
    }
    
    if (!Array.isArray(updatedData.resources)) {
      updatedData.resources = ensureArray(updatedData.resources);
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      setFormData(updatedData);
    }
  }, []);
  
  // General input change handler
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
  
  // Array item handlers
  const handleArrayChange = (type, index, value) => {
    setFormData(prev => {
      // Make sure we're working with an array
      const currentArray = Array.isArray(prev[type]) ? prev[type] : [''];
      const newArray = [...currentArray];
      newArray[index] = value;
      return {
        ...prev,
        [type]: newArray
      };
    });
  };
  
  const addArrayItem = (type) => {
    setFormData(prev => {
      // Make sure we're working with an array
      const currentArray = Array.isArray(prev[type]) ? prev[type] : [''];
      return {
        ...prev,
        [type]: [...currentArray, '']
      };
    });
  };
  
  const removeArrayItem = (type, index) => {
    setFormData(prev => {
      // Make sure we're working with an array
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
  const validateForm = (additionalValidation = () => ({})) => {
    const newErrors = {};
    
    // Title is required
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    // Duration must be a positive number
    if (!formData.duration_days || formData.duration_days < 1) {
      newErrors.duration_days = 'Duration must be at least 1 day';
    }
    
    // Merge with any additional validation rules
    const additionalErrors = additionalValidation(formData);
    const allErrors = { ...newErrors, ...additionalErrors };
    
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };
  
  // Prepare form data for submission
  const prepareFormData = () => {
    // Filter out empty array items before submitting
    const cleanedData = {
      ...formData,
      actions: Array.isArray(formData.actions) 
        ? formData.actions.filter(item => item && item.trim() !== '') 
        : [],
      resources: Array.isArray(formData.resources) 
        ? formData.resources.filter(item => item && item.trim() !== '') 
        : []
    };
    
    // Process numeric fields
    if (cleanedData.duration_days) {
      cleanedData.duration_days = parseInt(cleanedData.duration_days, 10);
    }
    
    
    
    return cleanedData;
  };
  
  return {
    formData,
    errors,
    handleChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    validateForm,
    prepareFormData
  };
};

export default useTemplateTaskForm;