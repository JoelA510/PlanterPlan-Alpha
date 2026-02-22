import TaskFormFields from '@/features/tasks/components/TaskFormFields';

const EditTaskForm = ({
  formData,
  errors,
  isSubmitting,
  handleChange,
  handleSubmit,
  onCancel,
  origin = 'instance',
  submitLabel = 'Save Changes',
  parentTask,
}) => {
  return (
    <form onSubmit={handleSubmit} className="project-form">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {origin === 'template' ? 'Editing Template Task' : 'Editing Project Task'}
      </div>

      {/* Parent Task Info */}
      {parentTask && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-500">Parent Task:</span>
          <span className="font-medium">{parentTask.title}</span>
        </div>
      )}

      <TaskFormFields
        formData={formData}
        errors={errors}
        handleChange={handleChange}
        origin={origin}
      />

      <div className="form-actions mt-6 flex justify-end space-x-3 border-t border-slate-100 pt-4">
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

export default EditTaskForm;
