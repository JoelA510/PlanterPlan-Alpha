import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useTaskQuery } from '@/features/tasks/hooks/useTaskQuery';
import { useUpdateTask } from '@/features/tasks/hooks/useTaskMutations';
import { useTaskTree } from '@/features/tasks/hooks/useTaskTree';
import { useExpandedTasks } from '@/features/tasks/hooks/useExpandedTasks';
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

  const createProject = async (data: ProjectFormData) => createProjectAsync(data);
  const handleSelectProjectWrapper = async (p: SelectableProject) => {
    if (!p) return;
    return {} as SelectableProject; useTaskBoardUI but we provide the logic
    return {} as never; 
  };
  const deleteTask = async () => {
    // Handled by useTaskBoardUI internally via props
    return;
  };


  // 2. Selection & State Layer
  const {
    activeProjectId,
    handleSelectProject,
    hydrationError,
  } = useProjectSelection({
    urlProjectId,
    instanceTasks: tasks.filter((t: TaskRow) => t.origin === 'instance') as TaskRow[],
    templateTasks: tasks.filter((t: TaskRow) => t.origin === 'template') as TaskRow[],
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

  const { activeProject, instanceTasks, templateTasks } = useTaskTree({
    tasks,
    hydratedProjects: hydratedProjects as Record<string, any[]>,
    activeProjectId,
    joinedProjects: (joinedProjects || []) as Project[],
    expandedTaskIds,
  });

 const {
 showForm,
 taskFormState,
 selectedTask,
 setSelectedTask,
 handleTaskClick,
 handleAddChildTask,
 handleEditTask,
 onDeleteTaskWrapper,
 handleDeleteById,
 setTaskFormState,
 handleTaskSubmit,
 } = useTaskBoardUI({
 currentUserId,
 createProject,
    createTaskOrUpdate: createTaskOrUpdate as (data: TaskFormData) => Promise<void>,
    deleteTask: deleteTask as (taskId: string) => Promise<void>,
    refreshProjectDetails: refetchProjects,
    findTask: findTask as (id: string) => TaskRow | null,
    activeProjectId,
 });

  // Derived state for TaskDetailsPanel
  const parentTaskForForm = taskFormState?.parentId ? (findTask(taskFormState.parentId) || projectHierarchy.find((t: TaskRow) => t.id === taskFormState.parentId)) : null;
  const taskBeingEdited = taskFormState?.mode === 'edit' && taskFormState.taskId
    ? (findTask(taskFormState.taskId) || projectHierarchy.find((t: TaskRow) => t.id === taskFormState.taskId))
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
 onNewTemplateClick={() => {}}
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
          project={activeProject as Project}
          childrenTasks={taskTree}
          depth={0}
          handleTaskClick={(taskId) => setTaskFormState({ mode: 'edit', parentId: null, taskId })}
          onTaskUpdate={canEdit ? handleEditTask : undefined}
          onAddChildTask={canEdit ? handleAddChildTask : undefined}
          onToggleExpand={handleToggleExpand as (id: string) => void}
          disableDrag={joinedProjects?.some((jp: Project) => jp.id === activeProjectId)}
          activeProjectId={activeProjectId}
          isReadOnly={!canEdit}
          onStatusChange={(_, status) => updateTaskAsync({ taskId: _, updates: { status } } as { taskId: string, updates: Partial<TaskRow> })}
 />
 ) : (
 <EmptyProjectState
 onCreateProject={() => navigate('/projects/new')}
 />
 )}

 <TaskDetailsPanel
 showForm={showForm}
        taskFormState={taskFormState as { mode: 'create' | 'edit'; parentId: string | null; taskId?: string } | null}
        selectedTask={selectedTask as TaskRow | null}
        taskBeingEdited={taskBeingEdited as TaskRow | null}
        parentTaskForForm={parentTaskForForm as TaskRow | null}
        onClose={() => setSelectedTask(null)}
 handleTaskSubmit={handleTaskSubmit}
        activeProjectId={activeProjectId}
        canEdit={canEdit}
        setTaskFormState={setTaskFormState as (val: { mode: 'create' | 'edit'; parentId: string | null; taskId?: string } | null) => void}
        handleAddChildTask={handleAddChildTask as (parentId: string) => void}
        handleEditTask={handleEditTask as (task: TaskRow) => void}
        onDeleteTaskWrapper={onDeleteTaskWrapper as () => void}
        fetchTasks={refetchProjects}
 />
 </div>
 </DashboardLayout>
 );
};

export default TaskList;
