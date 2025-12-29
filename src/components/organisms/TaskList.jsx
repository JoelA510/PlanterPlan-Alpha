import React, { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import NewProjectForm from './NewProjectForm';
import NewTaskForm from './NewTaskForm';
import TaskDetailsView from '../templates/TaskDetailsView';
import MasterLibraryList from './MasterLibraryList';
import InviteMemberModal from './InviteMemberModal';
import ErrorBoundary from '../atoms/ErrorBoundary';
import TaskItem, { SortableTaskItem } from '../molecules/TaskItem';

// Hooks & Utils
import { useTaskOperations } from '../../hooks/useTaskOperations';
import { useTaskDrag } from '../../hooks/useTaskDrag';
import { separateTasksByOrigin } from '../../utils/viewHelpers';

const TaskList = () => {
  const {
    tasks,
    setTasks,
    joinedProjects,
    loading,
    error,
    joinedError,
    currentUserId,
    fetchTasks,
    createProject,
    createTaskOrUpdate,
    deleteTask
  } = useTaskOperations();

  const { sensors, handleDragEnd, moveError, setMoveError } = useTaskDrag({
    tasks,
    setTasks,
    fetchTasks,
    currentUserId
  });

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormState, setTaskFormState] = useState(null);
  const [inviteModalProject, setInviteModalProject] = useState(null);

  // --- Derived State via Helper ---
  const { instanceTasks, templateTasks } = useMemo(() => separateTasksByOrigin(tasks), [tasks]);


  // --- DND Droppables ---
  const { setNodeRef: setInstanceRootRef } = useDroppable({
    id: 'drop-root-instance',
    data: { type: 'container', parentId: null, origin: 'instance' },
  });

  const { setNodeRef: setTemplateRootRef } = useDroppable({
    id: 'drop-root-template',
    data: { type: 'container', parentId: null, origin: 'template' },
  });


  // --- Handlers ---

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowForm(false);
    setTaskFormState(null);
  };

  const getTaskById = useCallback(
    (taskId) => {
      if (taskId === null || taskId === undefined) return null;
      return tasks.find((task) => task.id === taskId) || null;
    },
    [tasks]
  );

  const handleCreateTemplateRoot = () => {
    setTaskFormState({
      mode: 'create',
      origin: 'template',
      parentId: null,
    });
    setShowForm(false);
    setSelectedTask(null);
  };

  const handleAddChildTask = (parentTask) => {
    setTaskFormState({
      mode: 'create',
      origin: parentTask.origin,
      parentId: parentTask.id,
    });
    setShowForm(false);
    setSelectedTask(null);
  };

  const handleEditTask = (task) => {
    setTaskFormState({
      mode: 'edit',
      origin: task.origin,
      parentId: task.parent_task_id || null,
      taskId: task.id,
    });
    setShowForm(false);
    setSelectedTask(task);
  };

  const onDeleteTaskWrapper = useCallback(async (task) => {
    const confirmed = window.confirm(
      `Delete "${task.title}" and its subtasks? This action cannot be undone.`
    );
    if (!confirmed) return;
    await deleteTask(task);

    if (selectedTask?.id === task.id) setSelectedTask(null);
    if (taskFormState?.taskId === task.id) setTaskFormState(null);
  }, [deleteTask, selectedTask, taskFormState]);

  const handleDeleteById = useCallback(
    (taskId) => {
      const task =
        tasks.find((t) => t.id === taskId) || joinedProjects.find((t) => t.id === taskId);
      if (task) {
        onDeleteTaskWrapper(task);
      }
    },
    [tasks, joinedProjects, onDeleteTaskWrapper]
  );


  const handleOpenInvite = (project) => {
    setInviteModalProject(project);
  };

  const handleProjectSubmit = async (formData) => {
    await createProject(formData);
    setShowForm(false);
  };

  const handleTaskSubmit = async (formData) => {
    await createTaskOrUpdate(formData, taskFormState);
    setTaskFormState(null);
  };


  // --- Render Helpers ---

  const parentTaskForForm = taskFormState?.parentId ? getTaskById(taskFormState.parentId) : null;
  const taskBeingEdited =
    taskFormState?.mode === 'edit' && taskFormState.taskId
      ? getTaskById(taskFormState.taskId)
      : null;
  const isTaskFormOpen = Boolean(taskFormState);

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


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-slate-600 font-medium">Loading your projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600 font-semibold">Error loading projects</div>
        </div>
        <div className="text-red-700 text-sm mt-1">{error}</div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="split-layout">
        <div className="task-list-area">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Dashboard</h1>
          </div>

          {moveError && (
            <div
              role="alert"
              className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded flex justify-between items-center text-sm"
            >
              <span>{moveError}</span>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setMoveError(null)}
                className="font-bold px-2 py-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          <div className="task-section">
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Joined Projects</h2>
                <span className="section-count">{joinedProjects.length}</span>
              </div>
            </div>
            {joinedError ? (
              <div className="text-sm text-red-600 px-4 py-8 border border-red-200 bg-red-50 rounded-lg">
                {joinedError}
              </div>
            ) : joinedProjects.length > 0 ? (
              <div className="task-cards-container">
                {joinedProjects.map((project) => (
                  <TaskItem
                    key={project.id}
                    task={project}
                    level={0}
                    onTaskClick={handleTaskClick}
                    selectedTaskId={selectedTask?.id}
                    onAddChildTask={undefined}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteById}
                    onInviteMember={
                      project.membership_role === 'owner' || project.creator === currentUserId
                        ? handleOpenInvite
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 px-4 py-8 border border-dashed border-slate-200 rounded-lg">
                You haven't joined any projects yet.
              </div>
            )}
          </div>

          <div className="task-section">
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Projects</h2>
                <span className="section-count">{instanceTasks.length}</span>
              </div>
              <button
                onClick={() => {
                  setShowForm(true);
                  setSelectedTask(null);
                  setTaskFormState(null);
                }}
                className="btn-new-item"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
                </svg>
                New Project
              </button>
            </div>
            {instanceTasks.length > 0 ? (
              <SortableContext
                items={instanceTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
                id="root-instance"
              >
                <div ref={setInstanceRootRef} className="task-cards-container">
                  {instanceTasks.map((project) => (
                    <SortableTaskItem
                      key={project.id}
                      task={project}
                      level={0}
                      onTaskClick={handleTaskClick}
                      selectedTaskId={selectedTask?.id}
                      onAddChildTask={handleAddChildTask}
                      onInviteMember={handleOpenInvite}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteById}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              <div
                ref={setInstanceRootRef}
                className="text-sm text-slate-500 px-4 py-8 border border-dashed border-slate-200 rounded-lg"
              >
                No active projects yet. Use "New Project" to get started.
              </div>
            )}
          </div>

          <div className="task-section">
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Templates</h2>
                <span className="section-count">{templateTasks.length}</span>
              </div>
              <button onClick={handleCreateTemplateRoot} className="btn-new-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
                </svg>
                New Template
              </button>
            </div>
            {templateTasks.length > 0 ? (
              <SortableContext
                items={templateTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
                id="root-template"
              >
                <div ref={setTemplateRootRef} className="task-cards-container">
                  {templateTasks.map((template) => (
                    <SortableTaskItem
                      key={template.id}
                      task={template}
                      level={0}
                      onTaskClick={handleTaskClick}
                      selectedTaskId={selectedTask?.id}
                      onAddChildTask={handleAddChildTask}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              <div
                ref={setTemplateRootRef}
                className="text-sm text-slate-500 px-4 py-8 border border-dashed border-slate-200 rounded-lg"
              >
                No templates yet. Use "New Template" to start building your reusable library.
              </div>
            )}
          </div>

          <MasterLibraryList />
        </div>

        <div className="permanent-side-panel">
          <div className="panel-header">
            <h2 className="panel-title">{panelTitle}</h2>
            {showForm && (
              <button onClick={() => setShowForm(false)} className="panel-header-btn">
                Hide Form
              </button>
            )}
            {isTaskFormOpen && (
              <button onClick={() => setTaskFormState(null)} className="panel-header-btn">
                Cancel
              </button>
            )}
            {selectedTask && !showForm && !isTaskFormOpen && (
              <button onClick={() => setSelectedTask(null)} className="panel-header-btn">
                Close
              </button>
            )}
          </div>
          <div className="panel-content">
            {showForm ? (
              <NewProjectForm onSubmit={handleProjectSubmit} onCancel={() => setShowForm(false)} />
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
            ) : (
              <div className="empty-panel-state">
                <div className="empty-panel-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="empty-panel-title">No Selection</h3>
                <p className="empty-panel-text">
                  Click "New Project" to create a project, or select a task to view its details.
                </p>
              </div>
            )}
          </div>
        </div>
        {inviteModalProject && (
          <InviteMemberModal
            project={inviteModalProject}
            onClose={() => setInviteModalProject(null)}
            onInviteSuccess={() => {
              // Maybe show a toast?
              alert('Invitation sent!');
              setInviteModalProject(null);
            }}
          />
        )}
      </div>
    </DndContext>
  );
};

// Export wrapped component
const TaskListWithErrorBoundary = (props) => (
  <ErrorBoundary name="TaskList">
    <TaskList {...props} />
  </ErrorBoundary>
);

export default TaskListWithErrorBoundary;
