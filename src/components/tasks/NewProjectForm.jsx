import React, { useState } from 'react';

const NewProjectForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    purpose: '',
    actions: '',
    resources: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        resources: ''
      });
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to create project' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="project-form">
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