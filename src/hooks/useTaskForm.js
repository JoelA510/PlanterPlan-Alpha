import { useState, useCallback } from 'react';

/**
 * Custom hook to manage form state and logic for Tasks and Projects.
 * Handles:
 * - Form data state
 * - Template application (Master Library)
 * - Resource creator visibility
 * - Validation (basic)
 */
export const useTaskForm = (initialState, validateFn) => {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResourceCreator, setShowResourceCreator] = useState(false);
  const [lastAppliedTaskTitle, setLastAppliedTaskTitle] = useState('');

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleApplyFromLibrary = useCallback((task) => {
    setFormData((prev) => {
      const updates = {
        ...prev,
        title: task.title ?? prev.title,
        description: task.description ?? prev.description,
        notes: task.notes ?? prev.notes,
        // Map common fields - extend as needed
        purpose: task.purpose ?? prev.purpose,
        actions: task.actions ?? prev.actions,
        resources: task.resources ?? prev.resources,
        templateId: task.id,
      };

      // Handle days_from_start specifically for tasks
      if (
        Object.prototype.hasOwnProperty.call(prev, 'days_from_start') ||
        task.days_from_start !== undefined
      ) {
        if (task.days_from_start !== null && task.days_from_start !== undefined) {
          updates.days_from_start = String(task.days_from_start);
        }
      }

      // Handle raw dates if present in template (usually templates have offsets, but specific dates might exist)
      if (task.start_date) updates.start_date = task.start_date.split('T')[0];
      if (task.due_date) updates.due_date = task.due_date.split('T')[0];

      return updates;
    });
    setLastAppliedTaskTitle(task.title || '');
  }, []);

  const handleCreateResource = useCallback(() => {
    setShowResourceCreator(true);
  }, []);

  const dismissResourceCreator = useCallback(() => {
    setShowResourceCreator(false);
  }, []);

  const handleSubmit = async (e, onSubmit, onSuccess) => {
    e.preventDefault();

    if (validateFn) {
      const validationErrors = validateFn(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (onSuccess) onSuccess();

      // Reset generic "success" state
      setLastAppliedTaskTitle('');
      setShowResourceCreator(false);
    } catch (error) {
      setErrors((prev) => ({ ...prev, submit: error.message || 'Failed to save' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    showResourceCreator,
    lastAppliedTaskTitle,
    handleChange,
    handleApplyFromLibrary,
    handleCreateResource,
    dismissResourceCreator,
    handleSubmit,
  };
};
