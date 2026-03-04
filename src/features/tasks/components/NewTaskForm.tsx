
import { useEffect, useRef, useState, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { isDateValid, isBeforeDate } from '@/shared/lib/date-engine';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import TaskForm from '@/features/tasks/components/TaskForm';
import type { TaskFormData, TaskRow } from '@/shared/db/app.types';

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
    days_from_start: z.preprocess((val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        const num = typeof val === 'number' ? val : Number(val);
        return isNaN(num) ? undefined : num;
    }, z.number().min(0, 'Days from start must be zero or greater').optional()),
    start_date: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    templateId: z.string().nullable().optional(),
}).refine((data) => {
    if (origin === 'instance' && data.start_date && data.due_date) {
        const start = `${data.start_date}T00:00:00.000Z`;
        const due = `${data.due_date}T00:00:00.000Z`;
        if (isDateValid(start) && isDateValid(due) && isBeforeDate(due, start)) {
            return false;
        }
    }
    return true;
}, {
    message: 'Due date cannot be before start date',
    path: ['due_date']
});

const createInitialState = (task?: Partial<TaskRow> | null) => ({
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
    onSubmit: (data: TaskFormData) => Promise<void>;
    onCancel: () => void;
    parentTask?: { title: string } | null;
    initialTask?: Partial<TaskRow> | null;
    origin?: 'instance' | 'template';
    submitLabel?: string;
    renderLibrarySearch?: (onSelect: (task: Partial<TaskRow>) => void) => React.ReactNode;
}

const NewTaskForm = ({
    onSubmit,
    onCancel,
    parentTask,
    initialTask = null,
    origin = 'instance',
    submitLabel = 'Add New Task',
    renderLibrarySearch,
}: NewTaskFormProps) => {
    const isEditMode = Boolean(initialTask);
    const [lastAppliedTaskTitle, setLastAppliedTaskTitle] = useState('');
    const prevInitialTaskRef = useRef(initialTask);

    const methods = useForm<TaskFormData>({
        // @ts-expect-error Zod refinement output doesn't structurally match TaskFormData for resolver
        resolver: zodResolver(getTaskSchema(origin)),
        defaultValues: createInitialState(initialTask) as TaskFormData,
    });

    const { reset, setValue, formState: { isSubmitting } } = methods;

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

    const handleApplyFromLibrary = useCallback((task: Partial<TaskRow>) => {
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
        setLastAppliedTaskTitle(task.title || '');
    }, [setValue]);

    const handleFormSubmit = useCallback(async (data: TaskFormData) => {
        try {
            await onSubmit(data);
            if (!isEditMode) {
                reset(createInitialState(null));
                setLastAppliedTaskTitle('');
            }
        } catch (e) {
            console.error("Task submission failed:", e);
        }
    }, [onSubmit, isEditMode, reset]);

    return (
        <TaskForm
            formMethods={methods as unknown as UseFormReturn<TaskFormData>}
            isSubmitting={isSubmitting}
            initialData={initialTask}
            lastAppliedTaskTitle={lastAppliedTaskTitle}
            handleApplyFromLibrary={handleApplyFromLibrary}
            onSubmitHandler={handleFormSubmit}
            onCancel={onCancel}
            origin={origin}
            submitLabel={isEditMode ? submitLabel : undefined}
            renderLibrarySearch={renderLibrarySearch}
            parentTask={parentTask}
        />
    );
};

export default NewTaskForm;
