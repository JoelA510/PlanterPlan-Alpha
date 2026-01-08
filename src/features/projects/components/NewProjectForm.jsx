import React, { useCallback } from 'react';
import { useTaskForm } from '@features/tasks/hooks/useTaskForm';
import MasterLibrarySearch from '@features/library/components/MasterLibrarySearch';

const initialState = {
  title: '',
  description: '',
  purpose: '',
  actions: '',
  notes: '',
  start_date: '',
  templateId: null,
};

const NewProjectForm = ({ onSubmit, onCancel }) => {
  const validate = useCallback((data) => {
    const newErrors = {};

    if (!data.title?.trim()) {
      newErrors.title = 'Project title is required';
    }

    if (!data.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    return newErrors;
  }, []);

  const {
    formData,
    setFormData,
    errors,
    isSubmitting,
    lastAppliedTaskTitle,
    handleChange,
    handleApplyFromLibrary,
    handleSubmit: hookSubmit,
  } = useTaskForm(initialState, validate);

  const handleFormSubmit = (e) => {
    hookSubmit(e, onSubmit, () => {
      setFormData(initialState);
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="project-form">
      <div className="form-group">
        <MasterLibrarySearch
          mode="copy"
          onSelect={handleApplyFromLibrary}
          label="Search master library"
          placeholder="Search tasks to prefill this project"
        />
      </div>

      {lastAppliedTaskTitle && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Copied details from <span className="font-semibold">{lastAppliedTaskTitle}</span>.
        </div>
      )}

      {/* General error message */}
      {errors.submit && <div className="form-error-banner">{errors.submit}</div>}

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
        {errors.title && <span className="form-error">{errors.title}</span>}
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
          placeholder="Why is this project being created?"
          rows="3"
        />
      </div>

      <div className="form-group">
        <label htmlFor="start_date" className="form-label">
          Start Date <span className="required">*</span>
        </label>
        <input
          type="date"
          id="start_date"
          name="start_date"
          value={formData.start_date}
          onChange={handleChange}
          className={`form-input ${errors.start_date ? 'error' : ''}`}
        />
        {errors.start_date && <span className="form-error">{errors.start_date}</span>}
      </div>

      <div className="form-actions mt-6 flex justify-end space-x-3 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Create Project' : 'Create Project'}
        </button>
      </div>
    </form>
  );
};

export default NewProjectForm;
