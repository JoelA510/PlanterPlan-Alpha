import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import CreateTaskForm from '@/features/tasks/components/CreateTaskForm';
import EditTaskForm from '@/features/tasks/components/EditTaskForm';

const extractDateInput = (value) => {
  if (!value) return '';
  return value.slice(0, 10);
};

// We create a factory for the schema so we can access `origin` if we need dynamic rules, 
// but currently origin is mostly used for conditional rendering in the UI.
const getTaskSchema = (origin) => z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  actions: z.string().optional().nullable(),
  days_from_start: z.number().min(0, 'Days from start must be zero or greater').optional().or(z.nan()).or(z.string().transform(val => val === '' ? undefined : Number(val))),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  templateId: z.string().nullable().optional(),
}).refine((data) => {
  if (origin === 'instance' && data.start_date && data.due_date) {
    const start = new Date(`${data.start_date}T00:00:00.000Z`);
    const due = new Date(`${data.due_date}T00:00:00.000Z`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(due.getTime()) && due < start) {
      return false;
    }
  }
  return true;
}, {
  message: 'Due date cannot be before start date',
  path: ['due_date']
});

const createInitialState = (task) => ({
  title: task?.title ?? '',
  description: task?.description ?? '',
  notes: task?.notes ?? '',
  purpose: task?.purpose ?? '',
  actions: task?.actions ?? '',
  days_from_start:
    task?.days_from_start !== null && task?.days_from_start !== undefined
      ? Number(task.days_from_start)
      : undefined,
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
  const [lastAppliedTaskTitle, setLastAppliedTaskTitle] = useState('');

  const methods = useForm({
    resolver: zodResolver(getTaskSchema(origin)),
    defaultValues: createInitialState(initialTask),
  });

  const { reset, handleSubmit, setValue, formState: { isSubmitting } } = methods;

  // Reset form when initialTask changes (e.g., editing a different task)
  useEffect(() => {
    reset(createInitialState(initialTask));
    setLastAppliedTaskTitle('');
  }, [initialTask, reset]);

  const handleApplyFromLibrary = (task) => {
    if (!task) return;
    setValue('title', task.title || '', { shouldValidate: true });
    setValue('description', task.description || '', { shouldValidate: true });
    setValue('purpose', task.purpose || '', { shouldValidate: true });
    setValue('actions', task.actions || '', { shouldValidate: true });
    setValue('notes', task.notes || '', { shouldValidate: true });
    setValue('templateId', task.id || null, { shouldValidate: true });
    if (task.days_from_start !== null && task.days_from_start !== undefined) {
      setValue('days_from_start', Number(task.days_from_start), { shouldValidate: true });
    }
    setLastAppliedTaskTitle(task.title);
  };

  const handleFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      if (!isEditMode) {
        reset(createInitialState(null));
        setLastAppliedTaskTitle('');
      }
    } catch (e) {
      console.error("Task submission failed:", e);
    }
  };

  return (
    <FormProvider {...methods}>
      {isEditMode ? (
        <EditTaskForm
          isSubmitting={isSubmitting}
          handleSubmit={handleSubmit(handleFormSubmit)}
          onCancel={onCancel}
          origin={origin}
          submitLabel={submitLabel}
          parentTask={parentTask}
        />
      ) : (
        <CreateTaskForm
          isSubmitting={isSubmitting}
          lastAppliedTaskTitle={lastAppliedTaskTitle}
          handleApplyFromLibrary={handleApplyFromLibrary}
          handleSubmit={handleSubmit(handleFormSubmit)}
          onCancel={onCancel}
          origin={origin}
          submitLabel={submitLabel}
          enableLibrarySearch={enableLibrarySearch}
          parentTask={parentTask}
        />
      )}
    </FormProvider>
  );
};

export default NewTaskForm;
