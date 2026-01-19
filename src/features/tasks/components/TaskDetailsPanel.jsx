import React, { useMemo } from 'react';
import NewProjectForm from '@features/projects/components/NewProjectForm';
import NewTaskForm from '@features/tasks/components/NewTaskForm';
import TaskDetailsView from '@features/tasks/components/TaskDetailsView';

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
}) {
    const panelTitle = useMemo(() => {
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
    }, [showForm, taskFormState, taskBeingEdited, parentTaskForForm, selectedTask]);

    const isTaskFormOpen = Boolean(taskFormState);

    return (
        <div className="w-1/3 min-w-96 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 shadow-2xl z-10 h-full overflow-hidden transition-all duration-300">
            <div className="pt-8 px-6 pb-6 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-20">
                <h2 className="font-bold text-xl text-slate-800 truncate pr-4">{panelTitle}</h2>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                    aria-label="Close panel"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
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
        </div>
    );
}
