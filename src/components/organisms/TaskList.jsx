import React, { useCallback, useMemo, useState } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';

import NewProjectForm from './NewProjectForm';
import NewTaskForm from './NewTaskForm';
import TaskDetailsView from '../templates/TaskDetailsView';
import MasterLibraryList from './MasterLibraryList';
import InviteMemberModal from './InviteMemberModal';
import ErrorBoundary from '../atoms/ErrorBoundary';
import SideNav from './SideNav';
import ProjectTasksView from '../molecules/ProjectTasksView';

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
    deleteTask,
  } = useTaskOperations();

  const {
    sensors,
    handleDragEnd,
    moveError: _moveError,
    setMoveError: _setMoveError,
  } = useTaskDrag({
    tasks,
    setTasks,
    fetchTasks,
    currentUserId,
  });

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormState, setTaskFormState] = useState(null);
  const [inviteModalProject, setInviteModalProject] = useState(null);

  // --- Active Project Logic ---
  const [activeProjectId, setActiveProjectId] = useState(null);

  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return (
      tasks.find((t) => t.id === activeProjectId) ||
      joinedProjects.find((t) => t.id === activeProjectId) ||
      null
    );
  }, [activeProjectId, tasks, joinedProjects]);

  const handleProjectClick = (task) => {
    if (!task.parent_task_id) {
      setActiveProjectId(task.id);
      setSelectedTask(null);
      setShowForm(false);
    } else {
      handleTaskClick(task);
    }
  };

  // --- Derived State via Helper ---
  const { instanceTasks } = useMemo(() => separateTasksByOrigin(tasks), [tasks]);

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

  const onDeleteTaskWrapper = useCallback(
    async (task) => {
      const confirmed = window.confirm(
        `Delete "${task.title}" and its subtasks? This action cannot be undone.`
      );
      if (!confirmed) return;
      await deleteTask(task);

      if (selectedTask?.id === task.id) setSelectedTask(null);
      if (taskFormState?.taskId === task.id) setTaskFormState(null);
    },
    [deleteTask, selectedTask, taskFormState]
  );

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
      <div className="app-layout">
        <SideNav
          joinedProjects={joinedProjects}
          instanceTasks={instanceTasks}
          joinedError={joinedError}
          currentUserId={currentUserId}
          handleTaskClick={handleProjectClick}
          selectedTaskId={activeProjectId} // Highlight the active project in nav
          handleEditTask={handleEditTask}
          handleDeleteById={handleDeleteById}
          handleOpenInvite={handleOpenInvite}
          handleAddChildTask={handleAddChildTask}
          onNewProjectClick={() => {
            setShowForm(true);
            setSelectedTask(null);
            setTaskFormState(null);
          }}
        />

        <div className="main-content">
          <div className="project-view-area">
            {!activeProject ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <h2 className="text-xl font-semibold mb-2">Welcome to PlanterPlan</h2>
                <p>Select a project from the sidebar to view its tasks.</p>
                <div className="mt-8">
                  <MasterLibraryList />
                </div>
              </div>
            ) : (
              <ProjectTasksView
                project={activeProject}
                handleTaskClick={handleTaskClick} // Clicking a task in the board opens details
                handleAddChildTask={handleAddChildTask}
                handleOpenInvite={handleOpenInvite}
                handleEditTask={handleEditTask}
                handleDeleteById={handleDeleteById}
                selectedTaskId={selectedTask?.id}
              />
            )}
          </div>

          {/* Permanent Side Panel (Right) - Details / Forms */}
          {(showForm || selectedTask || taskFormState) && (
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
                  <NewProjectForm
                    onSubmit={handleProjectSubmit}
                    onCancel={() => setShowForm(false)}
                  />
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
          )}
        </div>

        {inviteModalProject && (
          <InviteMemberModal
            project={inviteModalProject}
            onClose={() => setInviteModalProject(null)}
            onInviteSuccess={() => {
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
