// src/hooks/useTaskForm.js
import { useState, useEffect } from 'react';
import { calculateDueDate, isValidDateRange } from '../../utils/dateUtils';

/**
 * Custom hook for handling task/project form state and logic
 * @param {Object} initialData - Initial form data values
 * @param {Date|string} parentStartDate - Start date of parent task (optional)
 * @returns {Object} Form state and handlers
 */
export const useTaskForm = (initialData = {}, parentStartDate = null) => {
  // Set default values with any passed initialData
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
    ...initialData
  });
  
  const [errors, setErrors] = useState({});
  const [calculatedDueDate, setCalculatedDueDate] = useState(null);
  
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
      actions: formData.actions.filter(item => item.trim() !== ''),
      resources: formData.resources.filter(item => item.trim() !== '')
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