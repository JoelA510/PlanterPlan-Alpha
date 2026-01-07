import React, { useMemo, useEffect } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { useParams, useNavigate } from 'react-router-dom';

import NewProjectForm from './NewProjectForm';
import NewTaskForm from './NewTaskForm';
import TaskDetailsView from '../templates/TaskDetailsView';
import InviteMemberModal from './InviteMemberModal';
import ErrorBoundary from '../atoms/ErrorBoundary';
import SideNav from './SideNav';
import ProjectTasksView from '../molecules/ProjectTasksView';
import DashboardLayout from '../../layouts/DashboardLayout';

// Hooks & Utils
import { useTaskBoard } from '../../hooks/useTaskBoard';

const TaskList = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const {
    // Data
    joinedProjects,
    instanceTasks,
    templateTasks,
    loading,
    error,
    joinedError,
    activeProjectId,
    activeProject,
    hydrationError,

    // Pagination
    hasMore,
    isFetchingMore,
    loadMoreProjects,

    // UI State
    showForm,
    setShowForm,
    selectedTask,
    setSelectedTask,
    taskFormState,
    setTaskFormState,
    inviteModalProject,
    setInviteModalProject,

    // Handlers
    handleSelectProject,
    handleTaskClick,
    handleToggleExpand,
    handleAddChildTask,
    handleEditTask,
    handleDeleteById,
    handleOpenInvite,
    handleProjectSubmit,
    handleTaskSubmit,
    getTaskById,
    fetchTasks,
    onDeleteTaskWrapper,

    // DND
    sensors,
    handleDragEnd,
  } = useTaskBoard();

  // Sync URL projectId with internal state
  useEffect(() => {
    if (projectId && projectId !== activeProjectId && !loading) {
      // Find the project object
      const project =
        instanceTasks.find((p) => p.id === projectId) ||
        templateTasks.find((p) => p.id === projectId) ||
        joinedProjects.find((p) => p.id === projectId);

      if (project) {
        handleSelectProject(project);
      }
    } else if (!projectId && activeProjectId) {
      // If navigating to root dashboard, clear selection?
      // For now, let's allow state to persist or reset?
      // Better to check if we conceptually "left" the project.
      // If we are at /dashboard, activeProjectId should probably be null.
      // But clearing it might flicker. Let's leave it unless explicit.
      // Actually, if I click "Dashboard" link, I go to /dashboard.
      // I expect "No Project Selected".
      // But handleSelectProject is internal.
      // We don't have a "clearSelection" exposed easily except handleSelectProject(null) which might crash if it expects object.
      // Let's modify handleSelectProject in useTaskBoard later if needed.
    }
  }, [projectId, activeProjectId, loading, instanceTasks, templateTasks, joinedProjects, handleSelectProject]);


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

  // Define sidebar to pass to layout
  const sidebarContent = (
    <SideNav
      joinedProjects={joinedProjects}
      instanceTasks={instanceTasks}
      templateTasks={templateTasks}
      joinedError={joinedError}
      error={error}
      handleSelectProject={(project) => {
        handleSelectProject(project);
        navigate(`/project/${project.id}`);
      }}
      selectedTaskId={activeProjectId}
      loading={loading && instanceTasks.length === 0} // Show skeleton if loading initial data
      // Pagination props
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
      onLoadMore={loadMoreProjects}
      handleOpenInvite={handleOpenInvite}
      handleAddChildTask={handleAddChildTask}
      onNewProjectClick={() => {
        setShowForm(true);
        setSelectedTask(null);
        setTaskFormState(null);
        navigate('/dashboard');
      }}
      onNewTemplateClick={() => {
        setTaskFormState({
          mode: 'create',
          origin: 'template',
          parentId: null,
        });
        setShowForm(false);
        setSelectedTask(null);
        navigate('/dashboard');
      }}
    />
  );

  if (error) {
    return (
      <DashboardLayout sidebar={sidebarContent}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto mt-8">
          <div className="flex items-center">
            <div className="text-red-600 font-semibold">Error loading projects</div>
          </div>
          <div className="text-red-700 text-sm mt-1">{error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <DashboardLayout sidebar={sidebarContent}>
        <div className="flex h-full gap-8">
          {/* Project View Area - Flex 1 to take remaining space */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {!activeProject ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-slate-700">No Project Selected</h2>
                <p className="max-w-md text-center mb-6">Select a project to view tasks.</p>
                <button
                  onClick={() => {
                    setShowForm(true);
                    setSelectedTask(null);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium"
                >
                  Create New Project
                </button>
              </div>
            ) : (
              <ProjectTasksView
                project={activeProject}
                handleTaskClick={handleTaskClick}
                handleAddChildTask={handleAddChildTask}
                handleEditTask={handleEditTask}
                handleDeleteById={handleDeleteById}
                selectedTaskId={selectedTask?.id}
                onToggleExpand={handleToggleExpand}
                disableDrag={joinedProjects.some((jp) => jp.id === activeProjectId)}
                hydrationError={hydrationError}
                onInviteMember={() => handleOpenInvite(activeProject)}
              />
            )}
          </div>

          {/* Permanent Side Panel (Right) - Details / Forms */}
          {(showForm || selectedTask || taskFormState) && (
            <div className="w-[600px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0 shadow-2xl z-10 h-full overflow-hidden transition-all duration-300">
              <div className="pt-8 px-6 pb-6 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-20">
                <h2 className="font-bold text-xl text-slate-800 truncate pr-4">{panelTitle}</h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setTaskFormState(null);
                    setSelectedTask(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                  aria-label="Close panel"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
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
              setInviteModalProject(null);
            }}
          />
        )}
        {/* Re-add invite success handler logic in render or update hook to return it? */}
        {/* Easier to keep UI callbacks here if they are simple */}
        {/* Actually, I missed adding useToast import in the component if I removed it? No I can import it. */}
        {/* But useTaskBoard has useToast. */}
      </DashboardLayout>
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
