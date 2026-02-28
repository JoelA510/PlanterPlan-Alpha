import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react';

/** Generic form data — callers define their own shape. */
type FormDataRecord = Record<string, unknown>;

/** Validation errors keyed by field name. */
type FormErrors = Record<string, string>;

type ValidateFn<T extends FormDataRecord> = (data: T) => FormErrors;

/** Task template shape used by handleApplyFromLibrary. */
interface LibraryTask {
    id: string;
    title?: string;
    description?: string;
    notes?: string;
    purpose?: string;
    actions?: string;
    resources?: string;
    days_from_start?: number | string | null;
    start_date?: string;
    due_date?: string;
    [key: string]: unknown;
}

interface UseTaskFormReturn<T extends FormDataRecord> {
    formData: T;
    setFormData: React.Dispatch<React.SetStateAction<T>>;
    errors: FormErrors;
    setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
    isSubmitting: boolean;
    showResourceCreator: boolean;
    lastAppliedTaskTitle: string;
    handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleApplyFromLibrary: (task: LibraryTask) => void;
    handleCreateResource: () => void;
    dismissResourceCreator: () => void;
    handleSubmit: (
        e: FormEvent,
        onSubmit: (data: T) => Promise<void>,
        onSuccess?: () => void
    ) => Promise<void>;
}

/**
 * Custom hook to manage form state and logic for Tasks and Projects.
 */
export const useTaskForm = <T extends FormDataRecord>(
    initialState: T,
    validateFn?: ValidateFn<T>
): UseTaskFormReturn<T> => {
    const [formData, setFormData] = useState<T>(initialState);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResourceCreator, setShowResourceCreator] = useState(false);
    const [lastAppliedTaskTitle, setLastAppliedTaskTitle] = useState('');

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    const handleApplyFromLibrary = useCallback((task: LibraryTask) => {
        setFormData((prev) => {
            const updates: Record<string, unknown> = {
                ...prev,
                title: task.title ?? (prev as FormDataRecord).title,
                description: task.description ?? (prev as FormDataRecord).description,
                notes: task.notes ?? (prev as FormDataRecord).notes,
                purpose: task.purpose ?? (prev as FormDataRecord).purpose,
                actions: task.actions ?? (prev as FormDataRecord).actions,
                resources: task.resources ?? (prev as FormDataRecord).resources,
                templateId: task.id,
            };

            if (
                Object.prototype.hasOwnProperty.call(prev, 'days_from_start') ||
                task.days_from_start !== undefined
            ) {
                if (task.days_from_start !== null && task.days_from_start !== undefined) {
                    updates.days_from_start = String(task.days_from_start);
                }
            }

            if (task.start_date) updates.start_date = task.start_date.split('T')[0];
            if (task.due_date) updates.due_date = task.due_date.split('T')[0];

            return updates as T;
        });
        setLastAppliedTaskTitle(task.title || '');
    }, []);

    const handleCreateResource = useCallback(() => {
        setShowResourceCreator(true);
    }, []);

    const dismissResourceCreator = useCallback(() => {
        setShowResourceCreator(false);
    }, []);

    const handleSubmit = async (
        e: FormEvent,
        onSubmit: (data: T) => Promise<void>,
        onSuccess?: () => void
    ): Promise<void> => {
        e.preventDefault();

        if (validateFn) {
            const validationErrors = validateFn(formData);
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            if (onSuccess) onSuccess();

            setLastAppliedTaskTitle('');
            setShowResourceCreator(false);
        } catch (error) {
            setErrors((prev) => ({
                ...prev,
                submit: (error as Error).message || 'Failed to save',
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        formData,
        setFormData,
        errors,
        setErrors,
        isSubmitting,
        showResourceCreator,
        lastAppliedTaskTitle,
        handleChange,
        handleApplyFromLibrary,
        handleCreateResource,
        dismissResourceCreator,
        handleSubmit,
    };
};
