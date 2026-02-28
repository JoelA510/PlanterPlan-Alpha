import { useFormContext } from 'react-hook-form';
import type { ReactNode } from 'react';
import type { TaskFormData } from '@/shared/db/app.types';

interface TaskFormFieldsProps {
    origin?: 'instance' | 'library' | string;
    renderExtraFields?: () => ReactNode;
}

const TaskFormFields = ({ origin, renderExtraFields }: TaskFormFieldsProps) => {
    const {
        register,
        formState: { errors },
    } = useFormContext<TaskFormData>();

    return (
        <>
            {errors.root?.message && <div className="form-error-banner">{errors.root.message}</div>}

            <div className="form-group">
                <label htmlFor="title" className="form-label">
                    Task Title <span className="required">*</span>
                </label>
                <input
                    type="text"
                    id="title"
                    autoFocus
                    className={`form-input ${errors.title ? 'error' : ''}`}
                    placeholder="Enter task title"
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
                    placeholder="Describe the task..."
                    rows={3}
                    {...register('description')}
                />
            </div>

            <div className="form-group">
                <label htmlFor="notes" className="form-label">
                    Notes / Context
                </label>
                <textarea
                    id="notes"
                    className="form-textarea"
                    placeholder="Internal notes, hints, or context..."
                    rows={2}
                    {...register('notes')}
                />
            </div>

            <div className="form-group">
                <label htmlFor="purpose" className="form-label">
                    Purpose
                </label>
                <textarea
                    id="purpose"
                    className="form-textarea"
                    placeholder="Why is this task needed?"
                    rows={2}
                    {...register('purpose')}
                />
            </div>

            <div className="form-group">
                <label htmlFor="actions" className="form-label">
                    Actions
                </label>
                <textarea
                    id="actions"
                    className="form-textarea"
                    placeholder="Specific actions to take..."
                    rows={2}
                    {...register('actions')}
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
                                className={`form-input pl-10 ${errors.days_from_start ? 'error' : ''}`}
                                placeholder="0"
                                min="0"
                                {...register('days_from_start', { valueAsNumber: true })}
                            />
                            <div className="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-slate-400">
                                <span className="text-sm font-medium">T+</span>
                            </div>
                        </div>
                        {errors.days_from_start && <span className="form-error">{errors.days_from_start.message}</span>}
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
                                    className="form-input"
                                    {...register('start_date')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="due_date" className="form-label">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    id="due_date"
                                    className={`form-input ${errors.due_date ? 'error' : ''}`}
                                    {...register('due_date')}
                                />
                                {errors.due_date && <span className="form-error">{errors.due_date.message}</span>}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default TaskFormFields;
