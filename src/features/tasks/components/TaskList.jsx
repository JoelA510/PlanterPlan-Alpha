import { useMemo, useEffect } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { useParams, useNavigate } from 'react-router-dom';

import NewProjectForm from '@/features/projects/components/NewProjectForm';
import NewTaskForm from '@/features/tasks/components/NewTaskForm';
import TaskDetailsView from '@/features/tasks/components/TaskDetailsView';
import InviteMemberModal from '@/features/projects/components/InviteMemberModal';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '@/shared/ui/ErrorFallback';

import ProjectSidebar from '@/features/navigation/components/ProjectSidebar';
import ProjectTasksView from './ProjectTasksView';
import DashboardLayout from '@layouts/DashboardLayout';
import TaskDetailsPanel from '@/features/tasks/components/TaskDetailsPanel';
import EmptyProjectState from '@/features/tasks/components/EmptyProjectState';
import StatusCard from '@/shared/ui/StatusCard';

// Hooks & Utils
import { useTaskOperations } from '@/features/tasks/hooks/useTaskOperations';
import { useProjectSelection } from '@/features/tasks/hooks/useProjectSelection';
import { useTaskTree } from '@/features/tasks/hooks/useTaskTree';
import { useTaskDragAndDrop } from '@/features/tasks/hooks/useTaskDragAndDrop';
import { useTaskBoardUI } from '@/features/tasks/hooks/useTaskBoardUI';

const TaskList = () => {
  const { projectId: urlProjectId } = useParams();
  const navigate = useNavigate();

  // 1. Core Data Layer
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
    updateTask,
    fetchProjectDetails,
    refreshProjectDetails,
    findTask,
    hasMore,
    isFetchingMore,
    loadMoreProjects,
    ...mutationUtils
  } = useTaskOperations();

  // 2. Project Selection Layer
  const { activeProjectId, handleSelectProject, hydrationError } = useProjectSelection({
    urlProjectId,
    instanceTasks: useMemo(() => tasks.filter(t => t.origin === 'instance'), [tasks]),
    templateTasks: useMemo(() => tasks.filter(t => t.origin === 'template'), [tasks]),
    joinedProjects,
    hydratedProjects: mutationUtils.hydratedProjects,
    fetchProjectDetails,
    loading,
  });

  // 3. Tree & UI Structure Layer
  const { activeProject, handleToggleExpand, instanceTasks, templateTasks } = useTaskTree({
    tasks,
    hydratedProjects: mutationUtils.hydratedProjects,
    activeProjectId,
    joinedProjects,
  });

  // 4. Interaction Layer (DnD)
  const { sensors, handleDragEnd } = useTaskDragAndDrop({
    tasks,
    hydratedProjects: mutationUtils.hydratedProjects,
    setTasks,
    fetchTasks,
    currentUserId,
    updateTask,
    handleOptimisticUpdate: mutationUtils.handleOptimisticUpdate,
    commitOptimisticUpdate: mutationUtils.commitOptimisticUpdate,
  });

  // 5. UI State & Orchestration Layer
  const {
    showForm,
    setShowForm,
    selectedTask,
    setSelectedTask,
    taskFormState,
    setTaskFormState,
    inviteModalProject,
    setInviteModalProject,
    handleTaskClick,
    handleAddChildTask,
    handleEditTask,
    handleDeleteById,
    handleOpenInvite,
    handleProjectSubmit,
    handleTaskSubmit,
    onDeleteTaskWrapper
  } = useTaskBoardUI({
    currentUserId,
    createProject,
    createTaskOrUpdate,
    deleteTask,
    refreshProjectDetails,
    findTask,
    activeProjectId,
  });

  // URL Syncing and Sidebar management continues as before...
  const handleSelectProjectWrapper = (project) => {
    handleSelectProject(project);
    setSelectedTask(null);
    setShowForm(false);
  };

  // --- Render Helpers ---

  const getTaskById = (taskId) => findTask(taskId);

  const parentTaskForForm = taskFormState?.parentId ? getTaskById(taskFormState.parentId) : null;
  const taskBeingEdited =
    taskFormState?.mode === 'edit' && taskFormState.taskId
      ? getTaskById(taskFormState.taskId)
      : null;

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
      loading={loading && instanceTasks.length === 0}
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
                onStatusChange={(taskId, status) =>
                  updateTask(taskId, {
                    status,
                    is_complete: status === 'completed',
                  })
                }
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
