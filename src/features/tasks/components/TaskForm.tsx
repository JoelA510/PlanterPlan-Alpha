import TaskFormFields from '@/features/tasks/components/TaskFormFields';
import type { TaskRow, TaskFormData } from '@/shared/db/app.types';
import { Button } from '@/shared/ui/button';

import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';

export interface TaskFormProps {
    formMethods: UseFormReturn<TaskFormData>;
    isSubmitting?: boolean;
    initialData?: Partial<TaskRow> | null;
    submitLabel?: string;
    handleApplyFromLibrary?: (task: TaskFormData | Partial<TaskRow>) => void;
    lastAppliedTaskTitle?: string;
    onSubmitHandler: (data: TaskFormData) => Promise<void> | void;
    onCancel: () => void;
    origin?: 'instance' | 'template';
    renderLibrarySearch?: (onSelect: (task: TaskFormData | Partial<TaskRow>) => void) => React.ReactNode;
    parentTask?: { title: string } | null;
}

const TaskForm = ({
    formMethods,
    isSubmitting = false,
    initialData,
    handleApplyFromLibrary,
    lastAppliedTaskTitle,
    onSubmitHandler,
    onCancel,
    origin = 'instance',
    renderLibrarySearch,
    parentTask,
}: TaskFormProps) => {
    const isEdit = !!initialData;
    const submitLabel = isEdit ? 'Save Changes' : 'Add New Task';

    return (
        <FormProvider {...formMethods}>
            <form onSubmit={formMethods.handleSubmit(onSubmitHandler)} className="project-form">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {origin === 'template'
                    ? (isEdit ? 'Editing Template Task' : 'Template Task')
                    : (isEdit ? 'Editing Project Task' : 'Project Task')}
            </div>

            {!isEdit && renderLibrarySearch && handleApplyFromLibrary && (
                <>
                    <div className="form-group mb-4">
                        {renderLibrarySearch(handleApplyFromLibrary)}
                    </div>

                    {lastAppliedTaskTitle && (
                        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            Copied details from <span className="font-semibold">{lastAppliedTaskTitle}</span>.
                        </div>
                    )}
                </>
            )}

            {/* Parent Task Info */}
            {parentTask && (
                <div className="mb-4 flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    <span className="font-semibold text-slate-500">{isEdit ? 'Parent Task:' : 'Adding to:'}</span>
                    <span className="font-medium">{parentTask.title}</span>
                </div>
            )}

            <TaskFormFields origin={origin} />

            <div className="form-actions mt-6 flex justify-end space-x-3 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-brand-500 hover:bg-brand-600 text-white">
                    {isSubmitting ? 'Saving...' : submitLabel}
                </Button>
            </div>
        </form>
    </FormProvider>
    );
};

export default TaskForm;
