import { useState, useEffect, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import TaskForm from '@/features/tasks/components/TaskForm';

const extractDateInput = (value?: string | null) => {
    if (!value) return '';
    return value.slice(0, 10);
};

const getTaskSchema = (origin: 'instance' | 'template') => z.object({
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

const createInitialState = (task?: Record<string, unknown> | null) => ({
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

export interface NewTaskFormProps {
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    onCancel: () => void;
    parentTask?: { title: string } | null;
    initialTask?: Record<string, unknown> | null;
    origin?: 'instance' | 'template';
    submitLabel?: string;
    enableLibrarySearch?: boolean;
}

const NewTaskForm = ({
    onSubmit,
    onCancel,
    parentTask,
    initialTask = null,
    origin = 'instance',
    submitLabel = 'Add New Task',
    enableLibrarySearch = true,
}: NewTaskFormProps) => {
    const isEditMode = Boolean(initialTask);
    const [lastAppliedTaskTitle, setLastAppliedTaskTitle] = useState('');
    const prevInitialTaskRef = useRef(initialTask);

    const methods = useForm({
        resolver: zodResolver(getTaskSchema(origin)),
        defaultValues: createInitialState(initialTask),
    });

    const { reset, handleSubmit, setValue, formState: { isSubmitting } } = methods;

    useEffect(() => {
        reset(createInitialState(initialTask));
    }, [initialTask, reset]);

    // Reset applied title when initialTask changes using ref comparison
    if (prevInitialTaskRef.current !== initialTask) {
        prevInitialTaskRef.current = initialTask;
        if (lastAppliedTaskTitle !== '') {
            setLastAppliedTaskTitle('');
        }
    }

    const handleApplyFromLibrary = (task: Record<string, unknown>) => {
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

    const handleFormSubmit = async (data: Record<string, unknown>) => {
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
            <TaskForm
                isSubmitting={isSubmitting}
                initialData={initialTask}
                lastAppliedTaskTitle={lastAppliedTaskTitle}
                handleApplyFromLibrary={handleApplyFromLibrary}
                handleSubmit={handleSubmit(handleFormSubmit)}
                onCancel={onCancel}
                origin={origin}
                submitLabel={isEditMode ? submitLabel : undefined}
                enableLibrarySearch={enableLibrarySearch}
                parentTask={parentTask}
            />
        </FormProvider>
    );
};

export default NewTaskForm;
