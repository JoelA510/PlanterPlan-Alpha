// src/hooks/useTaskForm.js
import { useState } from 'react';

/**
 * Custom hook for handling task/project form state and logic
 * @param {Object} initialData - Initial form data values
 * @returns {Object} Form state and handlers
 */
export const useTaskForm = (initialData = {}) => {
  // Set default values with any passed initialData
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    description: '',
    actions: [''],
    resources: [''],
    ...initialData
  });
  
  const [errors, setErrors] = useState({});
  
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
  
  const handleArrayChange = (type, index, value) => {
    setFormData(prev => {
      const newArray = [...prev[type]];
      newArray[index] = value;
      return {
        ...prev,
        [type]: newArray
      };
    });
  };
  
  const addArrayItem = (type) => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }));
  };
  
  const removeArrayItem = (type, index) => {
    setFormData(prev => {
      const newArray = [...prev[type]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [type]: newArray.length === 0 ? [''] : newArray
      };
    });
  };
  
  const validateForm = (additionalValidation = () => ({})) => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    // Merge with any additional validation rules
    const additionalErrors = additionalValidation(formData);
    const allErrors = { ...newErrors, ...additionalErrors };
    
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };
  
  const prepareFormData = () => {
    // Filter out empty array items before submitting
    return {
      ...formData,
      actions: formData.actions.filter(item => item.trim() !== ''),
      resources: formData.resources.filter(item => item.trim() !== '')
    };
  };
  
  return {
    formData,
    setFormData,
    errors,
    setErrors,
    handleChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    validateForm,
    prepareFormData
  };
};