import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import MasterLibrarySearch from '@/features/library/components/MasterLibrarySearch';

const projectSchema = z.object({
    title: z.string().min(1, 'Project title is required'),
    description: z.string().optional(),
    purpose: z.string().optional(),
    actions: z.string().optional(),
    notes: z.string().optional(),
    start_date: z.string().min(1, 'Start date is required'),
    templateId: z.string().nullable().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const defaultValues: ProjectFormData = {
    title: '',
    description: '',
    purpose: '',
    actions: '',
    notes: '',
    start_date: '',
    templateId: null,
};

interface LibraryTask {
    id: string;
    title?: string;
    description?: string;
    purpose?: string;
    actions?: string;
    notes?: string;
    [key: string]: unknown;
}

interface NewProjectFormProps {
    onSubmit: (data: ProjectFormData) => Promise<void>;
    onCancel: () => void;
}

const NewProjectForm = ({ onSubmit, onCancel }: NewProjectFormProps) => {
    const [lastAppliedTaskTitle, setLastAppliedTaskTitle] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema),
        defaultValues,
    });

    const handleApplyFromLibrary = (task: LibraryTask) => {
        if (!task) return;
        setValue('title', task.title || '', { shouldValidate: true });
        setValue('description', task.description || '', { shouldValidate: true });
        setValue('purpose', task.purpose || '', { shouldValidate: true });
        setValue('actions', task.actions || '', { shouldValidate: true });
        setValue('notes', task.notes || '', { shouldValidate: true });
        setValue('templateId', task.id || null, { shouldValidate: true });
        setLastAppliedTaskTitle(task.title || '');
    };

    const handleFormSubmit = async (data: ProjectFormData) => {
        try {
            await onSubmit(data);
            reset(defaultValues);
            setLastAppliedTaskTitle('');
        } catch (e) {
            console.error('Submission failed', e);
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="project-form">
            <div className="form-group">
                <MasterLibrarySearch
                    mode="copy"
                    onSelect={(t) => handleApplyFromLibrary(t as LibraryTask)}
                    label="Search master library"
                    placeholder="Search tasks to prefill this project"
                />
            </div>

            {lastAppliedTaskTitle && (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Copied details from <span className="font-semibold">{lastAppliedTaskTitle}</span>.
                </div>
            )}

            {errors.root?.message && <div className="form-error-banner">{errors.root.message}</div>}

            <div className="form-group">
                <label htmlFor="title" className="form-label">
                    Project Title <span className="required">*</span>
                </label>
                <input
                    type="text"
                    id="title"
                    autoFocus
                    className={`form-input ${errors.title ? 'error' : ''}`}
                    placeholder="Enter project title"
                    {...register('title')}
                />
                {errors.title && <span className="form-error">{errors.title.message}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="description" className="form-label">
                    Description
                </label>
                <textarea
                    id="description"
                    className="form-textarea"
                    placeholder="Describe this project..."
                    rows={4}
                    {...register('description')}
                />
            </div>

            <div className="form-group">
                <label htmlFor="purpose" className="form-label">
                    Purpose
                </label>
                <textarea
                    id="purpose"
                    className="form-textarea"
                    placeholder="Why is this project being created?"
                    rows={3}
                    {...register('purpose')}
                />
            </div>

            <div className="form-group">
                <label htmlFor="start_date" className="form-label">
                    Start Date <span className="required">*</span>
                </label>
                <input
                    type="date"
                    id="start_date"
                    className={`form-input ${errors.start_date ? 'error' : ''}`}
                    {...register('start_date')}
                />
                {errors.start_date && <span className="form-error">{errors.start_date.message}</span>}
            </div>

            <div className="form-actions mt-6 flex justify-end space-x-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
            </div>
        </form>
    );
};

export default NewProjectForm;
