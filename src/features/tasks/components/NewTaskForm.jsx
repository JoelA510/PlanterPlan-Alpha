import { useEffect, useCallback } from 'react';
import { useTaskForm } from '@features/tasks/hooks/useTaskForm';
import CreateTaskForm from '@features/tasks/components/CreateTaskForm';
import EditTaskForm from '@features/tasks/components/EditTaskForm';

const extractDateInput = (value) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const createInitialState = (task) => ({
  title: task?.title ?? '',
  description: task?.description ?? '',
  notes: task?.notes ?? '',
  purpose: task?.purpose ?? '',
  actions: task?.actions ?? '',
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
  const isEditMode = Boolean(initialTask);

  const validate = useCallback(
    (data) => {
      const newErrors = {};

      if (!data.title?.trim()) {
        newErrors.title = 'Task title is required';
      }

      if (
        data.days_from_start !== '' &&
        data.days_from_start !== undefined &&
        data.days_from_start !== null
      ) {
        const value = Number(data.days_from_start);
        if (Number.isNaN(value) || value < 0) {
          newErrors.days_from_start = 'Days from start must be zero or greater';
        }
      }

      if (origin === 'instance') {
        if (data.start_date && data.due_date) {
          const start = new Date(`${data.start_date}T00:00:00.000Z`);
          const due = new Date(`${data.due_date}T00:00:00.000Z`);

          if (!Number.isNaN(start.getTime()) && !Number.isNaN(due.getTime()) && due < start) {
            newErrors.due_date = 'Due date cannot be before start date';
          }
        }
      }

      return newErrors;
    },
    [origin]
  );

  const {
    formData,
    setFormData,
    errors,
    isSubmitting,
    lastAppliedTaskTitle,
    handleChange,
    handleApplyFromLibrary,
    handleSubmit: hookSubmit,
  } = useTaskForm(createInitialState(initialTask), validate);

  // Update form data when initialTask changes (for re-use)
  useEffect(() => {
    setFormData(createInitialState(initialTask));
  }, [initialTask, setFormData]);

  const handleFormSubmit = (e) => {
    hookSubmit(e, onSubmit, () => {
      if (!isEditMode) {
        setFormData(createInitialState(null));
      }
    });
  };

  if (isEditMode) {
    return (
      <EditTaskForm
        formData={formData}
        errors={errors}
        isSubmitting={isSubmitting}
        handleChange={handleChange}
        handleSubmit={handleFormSubmit}
        onCancel={onCancel}
        origin={origin}
        submitLabel={submitLabel}
        parentTask={parentTask}
      />
    );
  }

  return (
    <CreateTaskForm
      formData={formData}
      errors={errors}
      isSubmitting={isSubmitting}
      lastAppliedTaskTitle={lastAppliedTaskTitle}
      handleChange={handleChange}
      handleApplyFromLibrary={handleApplyFromLibrary}
      handleSubmit={handleFormSubmit}
      onCancel={onCancel}
      origin={origin}
      submitLabel={submitLabel}
      enableLibrarySearch={enableLibrarySearch}
      parentTask={parentTask}
    />
  );
};

export default NewTaskForm;
