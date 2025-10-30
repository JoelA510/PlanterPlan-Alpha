import React, { useState } from 'react';
import MasterLibrarySearch from './MasterLibrarySearch';

const NewProjectForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    purpose: '',
    actions: '',
    resources: '',
    notes: '',
    start_date: ''
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
      newErrors.title = 'Project title is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyFromLibrary = (task) => {
    setFormData(prev => ({
      ...prev,
      title: task.title ?? prev.title,
      description: task.description ?? prev.description,
      purpose: task.purpose ?? prev.purpose,
      actions: task.actions ?? prev.actions,
      resources: task.resources ?? prev.resources
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
        description: '',
        purpose: '',
        actions: '',
        resources: '',
        notes: '',
        start_date: ''
      });
      setLastAppliedTaskTitle('');
      setShowResourceCreator(false);
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to create project' });
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
          placeholder="Search tasks to prefill this project"
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
              Capture new resource details in the form fields below. Once saved, you can promote it to the master library later.
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
      {/* General error message */}
      {errors.submit && (
        <div className="form-error-banner">
          {errors.submit}
        </div>
      )}

      {/* Title Field */}
      <div className="form-group">
        <label htmlFor="title" className="form-label">
          Project Title <span className="required">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`form-input ${errors.title ? 'error' : ''}`}
          placeholder="Enter project title"
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
          placeholder="Describe this project..."
          rows="4"
        />
      </div>

      {/* Purpose Field */}
      <div className="form-group">
        <label htmlFor="purpose" className="form-label">
          Purpose
        </label>
        <textarea
          id="purpose"
          name="purpose"
          value={formData.purpose}
          onChange={handleChange}
          className="form-textarea"
          placeholder="What is the purpose of this project?"
          rows="3"
        />
      </div>

      {/* Actions Field */}
      <div className="form-group">
        <label htmlFor="actions" className="form-label">
          Actions
        </label>
        <textarea
          id="actions"
          name="actions"
          value={formData.actions}
          onChange={handleChange}
          className="form-textarea"
          placeholder="What actions need to be taken?"
          rows="3"
        />
      </div>

      {/* Start Date Field */}
      <div className="form-group">
        <label htmlFor="start_date" className="form-label">
          Project Start Date <span className="required">*</span>
        </label>
        <input
          type="date"
          id="start_date"
          name="start_date"
          value={formData.start_date}
          onChange={handleChange}
          className={`form-input ${errors.start_date ? 'error' : ''}`}
        />
        {errors.start_date && (
          <span className="form-error">{errors.start_date}</span>
        )}
      </div>

      {/* Resources Field */}
      <div className="form-group">
        <label htmlFor="resources" className="form-label">
          Resources
        </label>
        <textarea
          id="resources"
          name="resources"
          value={formData.resources}
          onChange={handleChange}
          className="form-textarea"
          placeholder="What resources are needed?"
          rows="3"
        />
      </div>

      {/* Notes Field */}
      <div className="form-group">
        <label htmlFor="notes" className="form-label">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="form-textarea"
          placeholder="Internal notes for this project"
          rows="3"
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
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </form>
  );
};

export default NewProjectForm;
