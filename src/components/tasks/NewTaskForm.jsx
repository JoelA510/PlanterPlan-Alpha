import React, { useEffect, useState } from 'react';
import MasterLibrarySearch from './MasterLibrarySearch';

const extractDateInput = (value) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const createInitialState = (task) => ({
  title: task?.title ?? '',
  description: task?.description ?? '',
  notes: task?.notes ?? '',
  days_from_start:
    task?.days_from_start !== null && task?.days_from_start !== undefined
      ? String(task.days_from_start)
      : '',
  start_date: extractDateInput(task?.start_date),
  due_date: extractDateInput(task?.due_date),
  templateId: null,
});

const NewTaskForm = ({
  onSubmit,
  onCancel,
  parentTask,
  initialTask = null,
  origin = 'instance',
  submitLabel = 'Add New Task',
  enableLibrarySearch = true,
}) => {
  const [formData, setFormData] = useState(() => createInitialState(initialTask));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResourceCreator, setShowResourceCreator] = useState(false);
  const [lastAppliedTaskTitle, setLastAppliedTaskTitle] = useState('');
  const isEditMode = Boolean(initialTask);

  useEffect(() => {
    setFormData(createInitialState(initialTask));
    setErrors({});
    setLastAppliedTaskTitle('');
    setShowResourceCreator(false);
  }, [initialTask]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (
      formData.days_from_start !== '' &&
      formData.days_from_start !== undefined &&
      formData.days_from_start !== null
    ) {
      const value = Number(formData.days_from_start);
      if (Number.isNaN(value) || value < 0) {
        newErrors.days_from_start = 'Days from start must be zero or greater';
      }
    }

    if (origin === 'instance') {
      if (!formData.days_from_start && !formData.start_date && parentTask) {
        // Allow manual dates even without parent start; no error.
      }

      if (formData.start_date && formData.due_date) {
        const start = new Date(`${formData.start_date}T00:00:00.000Z`);
        const due = new Date(`${formData.due_date}T00:00:00.000Z`);

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(due.getTime()) && due < start) {
          newErrors.due_date = 'Due date cannot be before start date';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyFromLibrary = (task) => {
    setFormData((prev) => ({
      ...prev,
      title: task.title ?? prev.title,
      description: task.description ?? prev.description,
      notes: task.notes ?? prev.notes,
      days_from_start:
        task.days_from_start !== null && task.days_from_start !== undefined
          ? String(task.days_from_start)
          : prev.days_from_start,
      start_date: extractDateInput(task.start_date) || prev.start_date,
      due_date: extractDateInput(task.due_date) || prev.due_date,
      templateId: task.id,
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
      if (!isEditMode) {
        setFormData(createInitialState(null));
      }
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
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {origin === 'template' ? 'Template Task' : 'Project Task'}
      </div>

      {enableLibrarySearch && (
        <>
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
                  Creating a new resource? Add its details directly to this task, then share the
                  finalized task with your team.
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
        </>
      )}
      {/* Parent Task Info */}
      {parentTask && (
        <div className="parent-task-info">
          <span className="parent-label">Adding task to:</span>
          <span className="parent-name">{parentTask.title}</span>
        </div>
      )}

      {/* General error message */}
      {errors.submit && <div className="form-error-banner">{errors.submit}</div>}

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
          placeholder="Describe this task..."
          rows="6"
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
          placeholder="Internal notes or context..."
          rows="4"
        />
      </div>

      {/* Days from Start Field */}
      <div className="form-group">
        <label htmlFor="days_from_start" className="form-label">
          Days from project start
        </label>
        <input
          type="number"
          id="days_from_start"
          name="days_from_start"
          value={formData.days_from_start}
          onChange={handleChange}
          className="form-input"
          placeholder="Optional offset in days"
          min="0"
        />
        {errors.days_from_start && <span className="form-error">{errors.days_from_start}</span>}
        <span className="text-xs text-slate-500">
          Use this to schedule the task relative to the project start date.
        </span>
      </div>

      {origin === 'instance' && (
        <div className="form-group">
          <label className="form-label" htmlFor="start_date">
            Manual Schedule (optional)
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <span className="form-label text-xs text-slate-500">Start date</span>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div>
              <span className="form-label text-xs text-slate-500">Due date</span>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className={`form-input ${errors.due_date ? 'error' : ''}`}
              />
              {errors.due_date && <span className="form-error">{errors.due_date}</span>}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Provide dates when the offset isn’t known. Leaving all three fields blank keeps the
            current schedule.
          </p>
        </div>
      )}

      {/* Form Actions */}
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default NewTaskForm;
