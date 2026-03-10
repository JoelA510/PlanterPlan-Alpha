import { useMemo } from 'react';
import type { TaskRow, TaskFormData } from '@/shared/db/app.types';
import type { TaskItemData } from '@/features/tasks/components/TaskItem';

import TaskForm from '@/features/tasks/components/TaskForm';
import TaskDetailsView from '@/features/tasks/components/TaskDetailsView';
import { X } from 'lucide-react';

const getPanelTitle = (
 showForm?: boolean,
 taskFormState?: { mode?: 'create' | 'edit'; origin?: 'instance' | 'template' } | null,
 taskBeingEdited?: TaskRow,
 selectedTask?: TaskRow,
 parentTaskForForm?: TaskRow
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
 taskFormState?: { mode?: 'create' | 'edit'; origin?: 'instance' | 'template' } | null;
 selectedTask?: TaskRow;
 taskBeingEdited?: TaskRow;
 parentTaskForForm?: TaskRow;
 onClose: () => void;
 renderNewProjectForm?: () => React.ReactNode;
 renderLibrarySearch?: (onSelect: (task: Partial<TaskRow>) => void) => React.ReactNode;
 handleTaskSubmit?: (data: TaskFormData) => Promise<void>;
 setTaskFormState?: (state: { mode?: 'create' | 'edit'; origin?: 'instance' | 'template' } | null) => void;
 handleAddChildTask?: (task: TaskItemData) => void;
 handleEditTask?: (task: TaskItemData) => void;
 onDeleteTaskWrapper?: (taskId: string) => Promise<void>;
 fetchTasks?: () => void;
}

export default function TaskDetailsPanel({
 showForm,
 taskFormState,
 selectedTask,
 taskBeingEdited,
 parentTaskForForm,
 onClose,
 renderNewProjectForm,
 renderLibrarySearch,
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
 <aside className="w-full sm:w-1/3 sm:min-w-80 sm:max-w-md bg-white border-l border-slate-200 flex flex-col shadow-2xl z-30 h-full overflow-hidden transition-all duration-300">
 <div className="pt-8 px-6 pb-6 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-20">
 <h2 className="font-bold text-xl text-slate-800 truncate pr-4" title={panelTitle}>{panelTitle}</h2>
 <button
 onClick={onClose}
 className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
 aria-label="Close panel"
 >
 <X className="w-6 h-6" />
 </button>
 </div>
 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white ">
 {showForm && renderNewProjectForm ? (
 renderNewProjectForm()
 ) : isTaskFormOpen && setTaskFormState ? (
 <TaskForm
 parentTask={parentTaskForForm}
 initialTask={taskBeingEdited}
 origin={taskFormState?.origin}
 renderLibrarySearch={taskFormState?.mode !== 'edit' ? renderLibrarySearch : undefined}
 submitLabel={taskFormState?.mode === 'edit' ? 'Save Changes' : 'Add Task'}
 onSubmit={handleTaskSubmit || (async () => {})}
 onCancel={() => setTaskFormState(null)}
 />
 ) : selectedTask ? (
 <TaskDetailsView
 task={selectedTask as TaskItemData}
 onAddChildTask={handleAddChildTask}
 onEditTask={handleEditTask}
 onDeleteTask={(t) => onDeleteTaskWrapper ? onDeleteTaskWrapper(t.id) : undefined}
 onTaskUpdated={fetchTasks || (() => { })}
 />
 ) : null}
 </div>
 </aside>
 );
}
