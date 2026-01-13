const TaskFormFields = ({ formData, errors, handleChange, origin, renderExtraFields }) => {
  return (
    <>
      {errors.submit && <div className="form-error-banner">{errors.submit}</div>}

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
          placeholder="Describe the task..."
          rows="3"
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes" className="form-label">
          Notes / Context
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="form-textarea"
          placeholder="Internal notes, hints, or context..."
          rows="2"
        />
      </div>

      <div className="form-group">
        <label htmlFor="purpose" className="form-label">
          Purpose
        </label>
        <textarea
          id="purpose"
          name="purpose"
          value={formData.purpose ?? ''}
          onChange={handleChange}
          className="form-textarea"
          placeholder="Why is this task needed?"
          rows="2"
        />
      </div>

      <div className="form-group">
        <label htmlFor="actions" className="form-label">
          Actions
        </label>
        <textarea
          id="actions"
          name="actions"
          value={formData.actions ?? ''}
          onChange={handleChange}
          className="form-textarea"
          placeholder="Specific actions to take..."
          rows="2"
        />
      </div>

      {origin === 'instance' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="form-group">
            <label htmlFor="days_from_start" className="form-label">
              Days from Start
            </label>
            <div className="relative">
              <input
                type="number"
                id="days_from_start"
                name="days_from_start"
                value={formData.days_from_start}
                onChange={handleChange}
                className={`form-input pl-10 ${errors.days_from_start ? 'error' : ''}`}
                placeholder="0"
                min="0"
              />
              <div className="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-slate-400">
                <span className="text-sm font-medium">T+</span>
              </div>
            </div>
            {errors.days_from_start && <span className="form-error">{errors.days_from_start}</span>}
            <p className="mt-1 text-xs text-slate-500">
              Auto-calculates dates based on project start
            </p>
          </div>

          <div className="form-group">{/* Spacing placeholder */}</div>
        </div>
      )}

      {renderExtraFields && renderExtraFields()}

      {origin === 'instance' && (
        <>
          <div className="my-4 border-t border-slate-100 pt-4">
            <h4 className="mb-3 text-sm font-medium text-slate-700">Manual Schedule Overrides</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-group">
                <label htmlFor="start_date" className="form-label">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="due_date" className="form-label">
                  Due Date
                </label>
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
          </div>
        </>
      )}
    </>
  );
};

export default TaskFormFields;
