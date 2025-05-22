// src/components/TaskForm/useTemplateTaskForm.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook specifically for handling template task forms
 * @param {Object} initialData - Initial form data values
 * @param {Array} allTasks - All tasks for duration calculations
 * @returns {Object} Form state and handlers
 */
export const useTemplateTaskForm = (initialData = {}, allTasks = []) => {
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
  const processedInitialData = initialData ? { ...initialData } : {};
  
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
  } else {
    processedInitialData.actions = [''];
    processedInitialData.resources = [''];
  }
  
  // Set default values with any processed initialData
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    description: '',
    actions: [''],
    resources: [''],
    default_duration: 1, // New field for stored duration
    duration_days: 1,    // Field for effective duration (calculated)
    ...processedInitialData
  });
  
  const [errors, setErrors] = useState({});
  
  // New state for tracking affected ancestors and duration impacts
  const [affectedAncestors, setAffectedAncestors] = useState([]);
  const [calculatedDuration, setCalculatedDuration] = useState(formData.default_duration || 1);
  
  // Function to calculate parent duration from children
  const calculateParentDuration = useCallback((parentId, tasks) => {
    if (!parentId || !Array.isArray(tasks) || tasks.length === 0) {
      return 1; // Default minimum duration
    }
  
    // Get direct children of this parent
    const childTasks = tasks.filter(t => t.parent_task_id === parentId);
    
    if (childTasks.length === 0) {
      return 1; // Minimum duration if no children
    }
    
    // Sort children by position to ensure sequential calculation
    const sortedChildren = [...childTasks].sort((a, b) => a.position - b.position);
    
    // Sum the durations of all direct children
    const totalDuration = sortedChildren.reduce((sum, child) => {
      // Check if this child has its own children
      const hasChildren = tasks.some(t => t.parent_task_id === child.id);
      
      if (hasChildren) {
        // Recursively calculate this child's duration
        const calculatedDuration = calculateParentDuration(child.id, tasks);
        return sum + calculatedDuration;
      } else {
        // Use default_duration for leaf tasks if available, otherwise duration_days
        const childDuration = child.default_duration || child.duration_days || 1;
        return sum + childDuration;
      }
    }, 0);
    
    return Math.max(1, totalDuration);
  }, []);
  
  // Function to find and calculate impacts on ancestor tasks
  const calculateAncestorImpacts = useCallback(() => {
    // Skip if no parent task ID or no tasks provided
    if (!initialData.parent_task_id || !Array.isArray(allTasks) || allTasks.length === 0) {
      setAffectedAncestors([]);
      return;
    }
    
    // Find the parent task
    const parentTask = allTasks.find(t => t.id === initialData.parent_task_id);
    if (!parentTask) {
      setAffectedAncestors([]);
      return;
    }
    
    // Create a simulated tasks array including the form data as a new task
    const simulatedTask = {
      id: initialData.id || 'new-task', // Use existing ID or placeholder
      parent_task_id: initialData.parent_task_id,
      default_duration: formData.default_duration || 1,
      duration_days: formData.default_duration || 1, // For new tasks, these start the same
      position: initialData.position || 0
    };
    
    // Create simulated tasks array by either updating existing task or adding new one
    let simulatedTasks;
    if (initialData.id) {
      // Updating existing - replace the task
      simulatedTasks = allTasks.map(t => 
        t.id === initialData.id ? simulatedTask : t
      );
    } else {
      // Creating new - add the task
      simulatedTasks = [...allTasks, simulatedTask];
    }
    
    // Initialize array to track ancestor impacts
    const impacts = [];
    
    // Start with immediate parent and move up
    let currentParentId = initialData.parent_task_id;
    while (currentParentId) {
      const parentTask = allTasks.find(t => t.id === currentParentId);
      if (!parentTask) break;
      
      // Calculate current duration for this parent
      const currentDuration = calculateParentDuration(currentParentId, allTasks);
      
      // Calculate new duration with our simulated task
      const newDuration = calculateParentDuration(currentParentId, simulatedTasks);
      
      // If durations differ, add to impacts
      if (currentDuration !== newDuration) {
        impacts.push({
          id: currentParentId,
          title: parentTask.title,
          currentDuration,
          newDuration,
          difference: newDuration - currentDuration
        });
      }
      
      // Move up to the next ancestor
      currentParentId = parentTask.parent_task_id;
    }
    
    // Update state with the calculated impacts
    setAffectedAncestors(impacts);
    
    // Update the calculated duration for this task
    if (initialData.id) {
      // For existing tasks, get the new calculated duration
      const taskWithChildren = allTasks.some(t => t.parent_task_id === initialData.id);
      if (taskWithChildren) {
        const calculatedDur = calculateParentDuration(initialData.id, simulatedTasks);
        setCalculatedDuration(calculatedDur);
      } else {
        setCalculatedDuration(formData.default_duration || 1);
      }
    }
  }, [allTasks, formData.default_duration, initialData.id, initialData.parent_task_id, initialData.position, calculateParentDuration]);
  
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
  
  // Recalculate ancestor impacts when the form data changes
  useEffect(() => {
    calculateAncestorImpacts();
  }, [formData.default_duration, calculateAncestorImpacts]);
  
  // General input change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => {
      const updatedData = {
        ...prev,
        [name]: value
      };
      
      // Special handling for default_duration
      if (name === 'default_duration') {
        // Ensure it's a number and at least 1
        const numValue = Math.max(1, parseInt(value) || 1);
        updatedData.default_duration = numValue;
        
        // For tasks without children, update duration_days to match
        const hasChildren = allTasks.some(t => 
          t.parent_task_id === initialData.id
        );
        
        if (!hasChildren) {
          updatedData.duration_days = numValue;
        }
      }
      
      return updatedData;
    });
    
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
    if (!formData.default_duration || formData.default_duration < 1) {
      newErrors.default_duration = 'Duration must be at least 1 day';
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
    if (cleanedData.default_duration) {
      cleanedData.default_duration = parseInt(cleanedData.default_duration, 10);
    }
    
    // Set duration_days equal to default_duration for new tasks
    // The server will recalculate for tasks with children
    if (!initialData.id) {
      cleanedData.duration_days = cleanedData.default_duration;
    }
    
    return cleanedData;
  };
  
  return {
    formData,
    errors,
    affectedAncestors,
    calculatedDuration,
    handleChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    validateForm,
    prepareFormData
  };
};

export default useTemplateTaskForm;