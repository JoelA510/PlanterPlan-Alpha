import React, { useState } from 'react';
import MasterLibrarySearch from './MasterLibrarySearch';

const NewTaskForm = ({ onSubmit, onCancel, parentTask }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResourceCreator, setShowResourceCreator] = useState(false);
  const [lastAppliedTaskTitle, setLastAppliedTaskTitle] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyFromLibrary = (task) => {
    setFormData(prev => ({
      ...prev,
      title: task.title ?? prev.title,
      description: task.description ?? prev.description
    }));
    setLastAppliedTaskTitle(task.title || '');
  };

  const handleCreateResource = () => {
    setShowResourceCreator(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        title: '',
        description: ''
      });
      setLastAppliedTaskTitle('');
      setShowResourceCreator(false);
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to create task' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="project-form">
      <div className="form-group">
        <MasterLibrarySearch
          mode="copy"
          onSelect={handleApplyFromLibrary}
          onCreateResource={handleCreateResource}
          label="Search master library"
          placeholder="Start typing to copy an existing template task"
        />
      </div>

      {lastAppliedTaskTitle && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Copied details from <span className="font-semibold">{lastAppliedTaskTitle}</span>.
        </div>
      )}

      {showResourceCreator && (
        <div className="mb-4 rounded-md border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="flex items-start justify-between gap-4">
            <p>
              Creating a new resource? Add its details directly to this task, then share the finalized task with your team.
            </p>
            <button
              type="button"
              className="text-xs font-medium text-blue-700 hover:underline"
              onClick={() => setShowResourceCreator(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {/* Parent Task Info */}
      {parentTask && (
        <div className="parent-task-info">
          <span className="parent-label">Adding task to:</span>
          <span className="parent-name">{parentTask.title}</span>
        </div>
      )}

      {/* General error message */}
      {errors.submit && (
        <div className="form-error-banner">
          {errors.submit}
        </div>
      )}

      {/* Title Field */}
      <div className="form-group">
        <label htmlFor="title" className="form-label">
          Task Title <span className="required">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`form-input ${errors.title ? 'error' : ''}`}
          placeholder="Enter task title"
          autoFocus
        />
        {errors.title && (
          <span className="form-error">{errors.title}</span>
        )}
      </div>

      {/* Description Field */}
      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="form-textarea"
          placeholder="Describe this task..."
          rows="6"
        />
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add New Task'}
        </button>
      </div>
    </form>
  );
};

export default NewTaskForm;
