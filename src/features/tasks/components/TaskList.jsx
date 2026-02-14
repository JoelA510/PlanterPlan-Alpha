import { useMemo, useEffect } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { useParams, useNavigate } from 'react-router-dom';

import NewProjectForm from '@features/projects/components/NewProjectForm';
import NewTaskForm from '@features/tasks/components/NewTaskForm';
import TaskDetailsView from '@features/tasks/components/TaskDetailsView';
import InviteMemberModal from '@features/projects/components/InviteMemberModal';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '@shared/ui/ErrorFallback';

import ProjectSidebar from '@features/navigation/components/ProjectSidebar';
import ProjectTasksView from './ProjectTasksView';
import DashboardLayout from '@layouts/DashboardLayout';
import TaskDetailsPanel from '@features/tasks/components/TaskDetailsPanel';
import EmptyProjectState from '@features/tasks/components/EmptyProjectState';
import StatusCard from '@shared/ui/StatusCard';

// Hooks & Utils
import { useTaskBoard } from '@features/tasks/hooks/useTaskBoard';

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
    updateTask,

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
  }, [
    projectId,
    activeProjectId,
    loading,
    instanceTasks,
    templateTasks,
    joinedProjects,
    handleSelectProject,
  ]);

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
    <ProjectSidebar
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
        <div className="mt-8 mx-auto max-w-2xl">
          <StatusCard
            title="Error loading projects"
            description={error}
            variant="error"
          />
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
              <EmptyProjectState
                onCreateProject={() => {
                  setShowForm(true);
                  setSelectedTask(null);
                }}
              />
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
                onStatusChange={(taskId, status) => updateTask(taskId, { status })}
              />
            )}
          </div>

          {/* Permanent Side Panel (Right) - Details / Forms */}
          {(showForm || selectedTask || taskFormState) && (
            <TaskDetailsPanel
              showForm={showForm}
              taskFormState={taskFormState}
              selectedTask={selectedTask}
              taskBeingEdited={taskBeingEdited}
              parentTaskForForm={parentTaskForForm}
              onClose={() => {
                setShowForm(false);
                setTaskFormState(null);
                setSelectedTask(null);
              }}
              handleProjectSubmit={handleProjectSubmit}
              handleTaskSubmit={handleTaskSubmit}
              setTaskFormState={setTaskFormState}
              handleAddChildTask={handleAddChildTask}
              handleEditTask={handleEditTask}
              onDeleteTaskWrapper={onDeleteTaskWrapper}
              fetchTasks={fetchTasks}
            />
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
      </DashboardLayout>
    </DndContext>
  );
};

// Export wrapped component
const TaskListWithErrorBoundary = (props) => (
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onReset={() => window.location.reload()}
  >
    <TaskList {...props} />
  </ErrorBoundary>
);

export default TaskListWithErrorBoundary;
