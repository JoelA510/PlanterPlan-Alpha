import { useMemo } from 'react';
import NewProjectForm from '@/features/projects/components/NewProjectForm';
import NewTaskForm from '@/features/tasks/components/NewTaskForm';
import TaskDetailsView from '@/features/tasks/components/TaskDetailsView';
import { X } from 'lucide-react';

const getPanelTitle = (
    showForm?: boolean,
    taskFormState?: Record<string, unknown>,
    taskBeingEdited?: Record<string, unknown>,
    selectedTask?: Record<string, unknown>,
    parentTaskForForm?: Record<string, unknown>
) => {
    if (showForm) return 'New Project';
    if (taskFormState) {
        if (taskFormState.mode === 'edit') {
            return taskBeingEdited ? `Edit ${taskBeingEdited.title}` : 'Edit Task';
        }
        if (taskFormState.origin === 'template') {
            return parentTaskForForm
                ? `New Template Task in ${parentTaskForForm.title}`
                : 'New Template Task';
        }
        return parentTaskForForm ? `New Task in ${parentTaskForForm.title}` : 'New Task';
    }
    if (selectedTask) return selectedTask.title;
    return 'Details';
};

export interface TaskDetailsPanelProps {
    showForm: boolean;
    taskFormState?: Record<string, unknown>;
    selectedTask?: Record<string, unknown>;
    taskBeingEdited?: Record<string, unknown>;
    parentTaskForForm?: Record<string, unknown>;
    onClose: () => void;
    handleProjectSubmit: (data: Record<string, unknown>) => Promise<void>;
    handleTaskSubmit: (data: Record<string, unknown>) => Promise<void>;
    setTaskFormState: (state: Record<string, unknown> | null) => void;
    handleAddChildTask: (task: Record<string, unknown>) => void;
    handleEditTask: (task: Record<string, unknown>) => void;
    onDeleteTaskWrapper: (taskId: string) => Promise<void>;
    fetchTasks: () => void;
}

export default function TaskDetailsPanel({
    showForm,
    taskFormState,
    selectedTask,
    taskBeingEdited,
    parentTaskForForm,
    onClose,
    handleProjectSubmit,
    handleTaskSubmit,
    setTaskFormState,
    handleAddChildTask,
    handleEditTask,
    onDeleteTaskWrapper,
    fetchTasks,
}: TaskDetailsPanelProps) {
    const panelTitle = useMemo(() => {
        return getPanelTitle(showForm, taskFormState, taskBeingEdited, selectedTask, parentTaskForForm);
    }, [showForm, taskFormState, taskBeingEdited, parentTaskForForm, selectedTask]);

    const isTaskFormOpen = Boolean(taskFormState);

    return (
        <aside className="w-1/3 min-w-96 bg-white dark:bg-card border-l border-slate-200 dark:border-border flex flex-col flex-shrink-0 shadow-2xl z-30 h-full overflow-hidden transition-all duration-300">
            <div className="pt-8 px-6 pb-6 border-b border-slate-100 dark:border-border flex justify-between items-start bg-white dark:bg-card sticky top-0 z-20">
                <h2 className="font-bold text-xl text-slate-800 dark:text-foreground truncate pr-4" title={panelTitle}>{panelTitle}</h2>
                <button
                    onClick={onClose}
                    className="text-slate-400 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground p-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    aria-label="Close panel"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white dark:bg-card">
                {showForm ? (
                    <NewProjectForm onSubmit={handleProjectSubmit} onCancel={onClose} />
                ) : isTaskFormOpen ? (
                    <NewTaskForm
                        parentTask={parentTaskForForm}
                        initialTask={taskBeingEdited}
                        origin={taskFormState?.origin}
                        enableLibrarySearch={taskFormState?.mode !== 'edit'}
                        submitLabel={taskFormState?.mode === 'edit' ? 'Save Changes' : 'Add Task'}
                        onSubmit={handleTaskSubmit}
                        onCancel={() => setTaskFormState(null)}
                    />
                ) : selectedTask ? (
                    <TaskDetailsView
                        task={selectedTask}
                        onAddChildTask={handleAddChildTask}
                        onEditTask={handleEditTask}
                        onDeleteTask={onDeleteTaskWrapper}
                        onTaskUpdated={fetchTasks}
                    />
                ) : null}
            </div>
        </aside>
    );
}
