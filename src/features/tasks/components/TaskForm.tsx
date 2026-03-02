import { MasterLibrarySearch } from '@/features/library';
import TaskFormFields from '@/features/tasks/components/TaskFormFields';
import { FormEventHandler } from 'react';
import type { TaskRow } from '@/shared/db/app.types';
import { Button } from '@/shared/ui/button';

export interface TaskFormProps {
    isSubmitting?: boolean;
    initialData?: Partial<TaskRow>; // If initialData exists, mode = 'edit', else 'create'
    handleApplyFromLibrary?: (task: Partial<TaskRow>) => void;
    lastAppliedTaskTitle?: string;
    handleSubmit: FormEventHandler<HTMLFormElement>;
    onCancel: () => void;
    origin?: 'instance' | 'template';
    enableLibrarySearch?: boolean;
    parentTask?: { title: string } | null;
}

const TaskForm = ({
    isSubmitting = false,
    initialData,
    handleApplyFromLibrary,
    lastAppliedTaskTitle,
    handleSubmit,
    onCancel,
    origin = 'instance',
    enableLibrarySearch = true,
    parentTask,
}: TaskFormProps) => {
    const isEdit = !!initialData;
    const submitLabel = isEdit ? 'Save Changes' : 'Add New Task';

    return (
        <form onSubmit={handleSubmit} className="project-form">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {origin === 'template'
                    ? (isEdit ? 'Editing Template Task' : 'Template Task')
                    : (isEdit ? 'Editing Project Task' : 'Project Task')}
            </div>

            {!isEdit && enableLibrarySearch && handleApplyFromLibrary && (
                <>
                    <div className="form-group mb-4">
                        <MasterLibrarySearch
                            mode="copy"
                            onSelect={handleApplyFromLibrary}
                            label="Search master library"
                            placeholder="Start typing to copy an existing template task"
                        />
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
    );
};

export default TaskForm;
