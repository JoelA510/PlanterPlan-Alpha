// src/components/TaskForm/useTaskForm.js
import { useState, useEffect } from 'react';
import { calculateDueDate, isValidDateRange } from '../../utils/dateUtils';

/**
 * Custom hook for handling task/project form state and logic
 * @param {Object} initialData - Initial form data values
 * @param {Date|string} parentStartDate - Start date of parent task (optional)
 * @returns {Object} Form state and handlers
 */
export const useTaskForm = (initialData = {}, parentStartDate = null) => {
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
  
  // Log initial data for debugging
  console.log('useTaskForm initialData:', initialData);
  
  // Ensure actions and resources are arrays
  if (initialData) {
    try {
      processedInitialData.actions = ensureArray(initialData.actions);
      processedInitialData.resources = ensureArray(initialData.resources);
      
      // Log the processed arrays
      console.log('Processed arrays:', {
        actions: processedInitialData.actions,
        resources: processedInitialData.resources
      });
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
    start_date: '',
    days_from_start_until_due: 0,
    default_duration: 1,
    due_date: '',
    ...processedInitialData
  });
  
  const [errors, setErrors] = useState({});
  const [calculatedDueDate, setCalculatedDueDate] = useState(null);
  
  // Force actions and resources to be arrays in case they weren't properly converted
  useEffect(() => {
    const updatedData = { ...formData };
    let needsUpdate = false;
    
    if (!Array.isArray(updatedData.actions)) {
      console.log('Fixing actions array:', updatedData.actions);
      updatedData.actions = ensureArray(updatedData.actions);
      needsUpdate = true;
    }
    
    if (!Array.isArray(updatedData.resources)) {
      console.log('Fixing resources array:', updatedData.resources);
      updatedData.resources = ensureArray(updatedData.resources);
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      console.log('Updating form data with fixed arrays');
      setFormData(updatedData);
    }
  }, []);
  
  // Calculate due date when start date or duration changes
  useEffect(() => {
    if (formData.start_date && formData.default_duration) {
      const dueDate = calculateDueDate(
        formData.start_date,
        parseInt(formData.default_duration, 10)
      );
      
      if (dueDate) {
        setCalculatedDueDate(dueDate);
      }
    }
  }, [formData.start_date, formData.default_duration]);
  
  // When parent start date and days_from_start_until change, calculate the start date
  useEffect(() => {
    if (parentStartDate && formData.days_from_start_until_due !== undefined) {
      try {
        // Parse the parent start date
        const parent = new Date(parentStartDate);
        
        // Calculate this task's start date based on parent start + offset days
        const offsetDays = parseInt(formData.days_from_start_until_due, 10);
        const calculatedStart = new Date(parent);
        calculatedStart.setDate(calculatedStart.getDate() + offsetDays);
        
        // Format the date as YYYY-MM-DD for the input field
        const formattedDate = calculatedStart.toISOString().split('T')[0];
        
        // Update the start date in the form
        setFormData(prev => ({
          ...prev,
          start_date: formattedDate
        }));
      } catch (e) {
        console.error('Error calculating start date from parent:', e);
      }
    }
  }, [parentStartDate, formData.days_from_start_until_due]);
  
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
  
  // Specific handler for date fields to validate date ranges
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate date range when either date changes
    if (name === 'start_date' || name === 'due_date') {
      const start = name === 'start_date' ? value : formData.start_date;
      const due = name === 'due_date' ? value : formData.due_date;
      
      if (start && due && !isValidDateRange(start, due)) {
        setErrors(prev => ({
          ...prev,
          date_range: 'Start date must be before due date'
        }));
      } else {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors.date_range;
          return newErrors;
        });
      }
    }
  };
  
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
  
  const validateForm = (additionalValidation = () => ({})) => {
    const newErrors = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    // Validate dates if both are provided
    if (formData.start_date && formData.due_date) {
      if (!isValidDateRange(formData.start_date, formData.due_date)) {
        newErrors.date_range = 'Start date must be before due date';
      }
    }
    
    // Merge with any additional validation rules
    const additionalErrors = additionalValidation(formData);
    const allErrors = { ...newErrors, ...additionalErrors };
    
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };
  
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
    if (cleanedData.default_duration) {
      cleanedData.default_duration = parseInt(cleanedData.default_duration, 10);
    }
    
    if (cleanedData.days_from_start_until_due) {
      cleanedData.days_from_start_until_due = parseInt(cleanedData.days_from_start_until_due, 10);
    }
    
    // Use calculated due date if not manually set
    if (calculatedDueDate && !formData.due_date) {
      cleanedData.due_date = calculatedDueDate.toISOString().split('T')[0];
    }
    
    return cleanedData;
  };
  
  // Function to use the calculated due date
  const useDurationBasedScheduling = () => {
    if (calculatedDueDate) {
      setFormData(prev => ({
        ...prev,
        due_date: calculatedDueDate.toISOString().split('T')[0]
      }));
    }
  };
  
  return {
    formData,
    setFormData,
    errors,
    setErrors,
    calculatedDueDate,
    handleChange,
    handleDateChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    validateForm,
    prepareFormData,
    useDurationBasedScheduling
  };
};