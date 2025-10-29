// src/components/TaskForm/useTaskForm.js - FIXED VERSION
import { useState, useEffect, useRef } from 'react';
import { calculateDueDate, isValidDateRange } from '../../utils/dateUtils';

const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value : [''];
  }

  if (value === undefined || value === null) {
    return [''];
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed.length > 0 ? parsed : ['']) : [value];
    } catch (e) {
      return [value];
    }
  }

  return [value];
};

/**
 * Custom hook for handling task/project form state and logic
 * @param {Object} initialData - Initial form data values
 * @param {Date|string} parentStartDate - Start date of parent task (optional)
 * @returns {Object} Form state and handlers
 */
export const useTaskForm = (initialData = {}, parentStartDate = null) => {
  // Helper function to ensure array fields are properly formatted
  
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
    start_date: '',
    days_from_start_until_due: 0,
    duration_days: 1, // Changed from default_duration to duration_days
    due_date: '',
    ...processedInitialData
  });
  
  // 🔧 FIX: Add ref to prevent calculation loops
  const isCalculatingRef = useRef(false);
  const lastCalculationRef = useRef(0);
  
  // Add state to track when fields are manually changed to avoid calculation loops
  const [isManualUpdate, setIsManualUpdate] = useState(false);
  
  // Add new state to track the date calculation mode
  const [dateMode, setDateMode] = useState('calculateEndDate'); // 'calculateEndDate' or 'calculateDuration'
  
  const [errors, setErrors] = useState({});
  
  // Force actions and resources to be arrays in case they weren't properly converted
  useEffect(() => {
    setFormData(prev => {
      let needsUpdate = false;
      const next = { ...prev };

      if (!Array.isArray(prev.actions)) {
        next.actions = ensureArray(prev.actions);
        needsUpdate = true;
      }

      if (!Array.isArray(prev.resources)) {
        next.resources = ensureArray(prev.resources);
        needsUpdate = true;
      }

      return needsUpdate ? next : prev;
    });
  }, [formData.actions, formData.resources]);
  
  // 🔧 FIX: Separate effect to reset manual update flag
  useEffect(() => {
    if (isManualUpdate) {
      const timer = setTimeout(() => {
        setIsManualUpdate(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isManualUpdate]);
  
  // 🔧 FIX: Debounced date calculation logic
  useEffect(() => {
    // Prevent rapid successive calculations
    const now = Date.now();
    if (now - lastCalculationRef.current < 100) {
      return;
    }
    
    // Prevent cascading calculations
    if (isCalculatingRef.current || isManualUpdate) {
      return;
    }

    const performCalculation = () => {
      isCalculatingRef.current = true;
      lastCalculationRef.current = Date.now();
      
      try {
        if (dateMode === 'calculateEndDate') {
          // Calculate end date from start date and duration
          if (formData.start_date && formData.duration_days) {
            console.log('Calculating due date from start_date and duration_days:', {
              start_date: formData.start_date,
              duration_days: formData.duration_days
            });
            
            const dueDate = calculateDueDate(
              formData.start_date,
              parseInt(formData.duration_days, 10)
            );
            
            if (dueDate) {
              console.log('Calculated due date:', dueDate.toISOString());
              
              // In this mode, update the due date
              setFormData(prev => ({
                ...prev,
                due_date: dueDate.toISOString().split('T')[0]
              }));
              
              // Clear any date range errors
              setErrors(prev => {
                if (prev.date_range) {
                  const newErrors = {...prev};
                  delete newErrors.date_range;
                  return newErrors;
                }
                return prev;
              });
            }
          }
        } else if (dateMode === 'calculateDuration') {
          // Calculate duration from start date and end date
          if (formData.start_date && formData.due_date) {
            console.log('Calculating duration from start_date and due_date:', {
              start_date: formData.start_date,
              due_date: formData.due_date
            });
            
            const startDate = new Date(formData.start_date);
            const dueDate = new Date(formData.due_date);
            const differenceInTime = dueDate.getTime() - startDate.getTime();
            const differenceInDays = Math.ceil(differenceInTime / (1000 * 60 * 60 * 24));
            
            console.log('Calculated differenceInDays:', differenceInDays);
            
            // Only update if the dates are in the correct order
            if (differenceInDays >= 0) {
              setFormData(prev => ({
                ...prev,
                duration_days: differenceInDays
              }));
              
              // Clear any date range errors
              setErrors(prev => {
                if (prev.date_range) {
                  const newErrors = {...prev};
                  delete newErrors.date_range;
                  return newErrors;
                }
                return prev;
              });
            } else {
              console.warn('Invalid date range: start date is after due date');
              
              // Set the error for invalid date range
              setErrors(prev => ({
                ...prev,
                date_range: 'Start date must be before due date'
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error in date calculation:', error);
      } finally {
        // Reset calculation flag after a delay
        setTimeout(() => {
          isCalculatingRef.current = false;
        }, 50);
      }
    };

    // Debounce the calculation
    const timer = setTimeout(performCalculation, 100);
    return () => clearTimeout(timer);
    
  }, [formData.start_date, formData.due_date, formData.duration_days, dateMode, isManualUpdate]);
  
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
        
        console.log('Calculated start date from parent:', formattedDate);
        
        // Update the start date in the form
        setIsManualUpdate(true); // Prevent recalculation loop
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
    
    // Flag this as a manual update to prevent calculation loops
    setIsManualUpdate(true);
    
    console.log('handleChange:', { name, value });
    
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
  
  // Handler for date mode radio buttons
  const handleDateModeChange = (mode) => {
    console.log('Changing date mode to:', mode);
    setDateMode(mode);
    
    // Clear date range errors when switching modes
    setErrors(prev => {
      if (prev.date_range) {
        const newErrors = {...prev};
        delete newErrors.date_range;
        return newErrors;
      }
      return prev;
    });
  };
  
  // Specific handler for date fields to validate date ranges
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    
    // Flag this as a manual update to prevent calculation loops
    setIsManualUpdate(true);
    
    console.log('handleDateChange:', { name, value });
    
    // Update the form data with the new date value
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Only validate date range when in calculateDuration mode
    if (dateMode === 'calculateDuration' && (name === 'start_date' || name === 'due_date')) {
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
    } else if (dateMode === 'calculateEndDate') {
      // Clear any date range errors if we're in calculateEndDate mode
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.date_range;
        return newErrors;
      });
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
    
    // Validate dates if both are provided, but only in calculateDuration mode
    if (dateMode === 'calculateDuration' && formData.start_date && formData.due_date) {
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
    if (cleanedData.duration_days) {
      cleanedData.duration_days = parseInt(cleanedData.duration_days, 10);
    }
    
    if (cleanedData.days_from_start_until_due) {
      cleanedData.days_from_start_until_due = parseInt(cleanedData.days_from_start_until_due, 10);
    }
    
    return cleanedData;
  };
  
  return {
    formData,
    setFormData,
    errors,
    setErrors,
    dateMode,
    handleDateModeChange,
    handleChange,
    handleDateChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    validateForm,
    prepareFormData
  };
};