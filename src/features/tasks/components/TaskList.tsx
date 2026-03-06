import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useTaskQuery } from '@/features/tasks/hooks/useTaskQuery';
import { useUpdateTask, useCreateTask, useDeleteTask } from '@/features/tasks/hooks/useTaskMutations';
import { useTaskTree } from '@/features/tasks/hooks/useTaskTree';
import { useExpandedTasks } from '@/features/tasks/hooks/useExpandedTasks';
import { separateTasksByOrigin } from '@/shared/lib/tree-helpers';
import { Project, TaskRow, SelectableProject, TaskFormData } from '@/shared/db/app.types';
import { TaskFormState } from '@/features/tasks/hooks/useTaskBoardUI';
import React from 'react';
import { useProjectSelection } from '@/features/tasks/hooks/useProjectSelection';
import { useProjectData } from '@/features/projects/hooks/useProjectData';
import { ProjectSidebar } from '@/features/navigation';
import ProjectTasksView from './ProjectTasksView';
import DashboardLayout from '@/layouts/DashboardLayout';
import TaskDetailsPanel from '@/features/tasks/components/TaskDetailsPanel';
import EmptyProjectState from '@/features/tasks/components/EmptyProjectState';
import StatusCard from '@/shared/ui/StatusCard';

// Hooks & Utils
import { useCreateProject } from '@/features/projects/hooks/useProjectMutations';
import { useTaskBoardUI } from '@/features/tasks/hooks/useTaskBoardUI';

const TaskList = () => {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // 1. Data Fetching
  const {
    tasks,
    loading,
    error,
    refetchProjects,
    joinedProjects,
    findTask,
  } = useTaskQuery();

  const { mutateAsync: createProjectAsync } = useCreateProject();
  const { mutateAsync: updateTaskAsync } = useUpdateTask();
  const { instanceTasks, templateTasks } = useMemo(() => separateTasksByOrigin(tasks), [tasks]);

  // 2. Selection & State Layer
  const {
    activeProjectId,
    handleSelectProject,
  } = useProjectSelection({
    urlProjectId,
    instanceTasks,
    templateTasks,
    joinedProjects: (joinedProjects || []) as Project[],
    loading,
  });

  // Fetch the actual hierarchy from React Query cache
  const { projectHierarchy } = useProjectData(activeProjectId);

  // Purely derive the dictionary for the tree composition layer
  const hydratedProjects = React.useMemo(() => {
    if (!activeProjectId || !projectHierarchy || projectHierarchy.length === 0) return {};
    return { [activeProjectId]: projectHierarchy };
  }, [activeProjectId, projectHierarchy]);

  // 3. Tree & UI Structure Layer
  const { expandedTaskIds, handleToggleExpand } = useExpandedTasks();

  const { activeProject } = useTaskTree({
    tasks,
    hydratedProjects: hydratedProjects as Record<string, any[]>,
    activeProjectId,
    joinedProjects: (joinedProjects || []) as Project[],
    expandedTaskIds,
  });

  const { mutateAsync: createTaskAsync } = useCreateTask();
  const { mutateAsync: deleteTaskAsync } = useDeleteTask();

  const createTaskOrUpdateWrapper = async (data: TaskFormData, state: TaskFormState | null) => {
    if (state?.mode === 'edit' && state?.taskId) {
      return updateTaskAsync({ id: state.taskId, ...data } as any);
    }
    return createTaskAsync({ ...data, root_id: activeProjectId } as any);
  };

  const {
    showForm,
    taskFormState,
    selectedTask,
    setSelectedTask,
    handleAddChildTask,
    handleEditTask,
    onDeleteTaskWrapper,
    handleDeleteById,
    setTaskFormState,
    handleTaskSubmit,
  } = useTaskBoardUI({
    currentUserId,
    createProject: createProjectAsync as any,
    createTaskOrUpdate: createTaskOrUpdateWrapper as any,
    deleteTask: async (task: TaskRow) => { await deleteTaskAsync({ id: task.id, root_id: task.root_id }); },
    refreshProjectDetails: () => refetchProjects(),
    findTask: findTask as (id: string) => TaskRow | null,
    activeProjectId,
  });

  // Derived state for TaskDetailsPanel
  const parentTaskForForm = taskFormState?.parentId ? (findTask(taskFormState.parentId) || (projectHierarchy as any[]).find((t: any) => t.id === taskFormState.parentId)) : null;
  const taskBeingEdited = taskFormState?.mode === 'edit' && taskFormState.taskId
    ? (findTask(taskFormState.taskId) || (projectHierarchy as any[]).find((t: any) => t.id === taskFormState.taskId))
    : null;

  const sidebarContent = (
    <ProjectSidebar
      joinedProjects={(joinedProjects as Project[]) || []}
      instanceTasks={instanceTasks as TaskRow[]}
      templateTasks={templateTasks as TaskRow[]}
      loading={loading}
      error={error as string | null}
      handleSelectProject={handleSelectProject as (p: SelectableProject) => Promise<void>}
      selectedTaskId={activeProjectId}
      onNewProjectClick={() => navigate('/projects/new')}
      onNewTemplateClick={() => { }}
    />
  );

  if (error) {
    return (
      <DashboardLayout sidebar={sidebarContent}>
        <StatusCard
          title="Error Loading Projects"
          description={error}
          variant="error"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={sidebarContent}>
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        {activeProject ? (
          <ProjectTasksView
            project={activeProject as any}
            handleTaskClick={handleEditTask as any}
            handleAddChildTask={handleAddChildTask as any}
            handleEditTask={handleEditTask as any}
            handleDeleteById={handleDeleteById as any}
            onToggleExpand={handleToggleExpand as any}
            onStatusChange={(_, status) => updateTaskAsync({ id: _, updates: { status } } as any)}
            disableDrag={joinedProjects?.some((jp: any) => jp.id === activeProjectId)}
          />
        ) : (
          <EmptyProjectState
            onCreateProject={() => navigate('/projects/new')}
          />
        )}

        <TaskDetailsPanel
          showForm={showForm}
          taskFormState={taskFormState as any}
          selectedTask={selectedTask as any}
          taskBeingEdited={taskBeingEdited as any}
          parentTaskForForm={parentTaskForForm as any}
          onClose={() => setSelectedTask(null)}
          handleTaskSubmit={handleTaskSubmit}
          setTaskFormState={setTaskFormState as any}
          handleAddChildTask={handleAddChildTask as any}
          handleEditTask={handleEditTask as any}
          onDeleteTaskWrapper={onDeleteTaskWrapper as any}
          fetchTasks={refetchProjects}
        />
      </div>
    </DashboardLayout>
  );
};

export default TaskList;
