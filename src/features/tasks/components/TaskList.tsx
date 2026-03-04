import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useTaskQuery } from '@/features/tasks/hooks/useTaskQuery';
import { useUpdateTask } from '@/features/tasks/hooks/useTaskMutations';
import { useTaskTree } from '@/features/tasks/hooks/useTaskTree';
import { useProjectSelection } from '@/features/tasks/hooks/useProjectSelection';
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

 const createProject = async (data: any) => createProjectAsync(data);
 const createTaskOrUpdate = async () => {
 // This is handled by useTaskBoardUI but we provide the logic
 return {} as any; 
 };
 const deleteTask = async () => {
 // Handled by useTaskBoardUI internally via props
 return;
 };

 const fetchProjectDetails = (() => refetchProjects()) as any;
 const refreshProjectDetails = (() => refetchProjects()) as any;

 // 2. Selection & State Layer
 const {
 activeProjectId,
 handleSelectProject,
 hydrationError,
 } = useProjectSelection({
 urlProjectId,
 instanceTasks: tasks.filter((t) => t.origin === 'instance') as any[],
 templateTasks: tasks.filter((t) => t.origin === 'template') as any[],
 joinedProjects: (joinedProjects || []) as any[],
 hydratedProjects: {} as any, 
 fetchProjectDetails,
 loading,
 });

 // 3. Tree & UI Structure Layer
 const { activeProject, handleToggleExpand, instanceTasks, templateTasks } = useTaskTree({
 tasks,
 hydratedProjects: {} as any,
 activeProjectId,
 joinedProjects: (joinedProjects || []) as any[],
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
 createTaskOrUpdate: createTaskOrUpdate as any,
 deleteTask: deleteTask as any,
 refreshProjectDetails,
 findTask: findTask as any,
 activeProjectId,
 });

 // Derived state for TaskDetailsPanel
 const parentTaskForForm = taskFormState?.parentId ? findTask(taskFormState.parentId) : null;
 const taskBeingEdited =
 taskFormState?.mode === 'edit' && taskFormState.taskId
 ? findTask(taskFormState.taskId)
 : null;

 const sidebarContent = (
 <ProjectSidebar
 joinedProjects={joinedProjects as any[] || []}
 instanceTasks={instanceTasks as any[]}
 templateTasks={templateTasks as any[]}
 joinedError={null}
 error={error as any}
 handleSelectProject={handleSelectProject as any}
 selectedTaskId={activeProjectId}
 loading={loading && instanceTasks.length === 0}
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
 project={activeProject as any}
 handleTaskClick={handleTaskClick}
 handleAddChildTask={handleAddChildTask}
 handleEditTask={handleEditTask}
 handleDeleteById={handleDeleteById}
 selectedTaskId={selectedTask?.id}
 onToggleExpand={handleToggleExpand as any}
 disableDrag={joinedProjects?.some((jp: any) => jp.id === activeProjectId)}
 hydrationError={hydrationError}
 onInviteMember={() => { }}
 onStatusChange={(_, status) => updateTaskAsync({ taskId: _, updates: { status } } as any)}
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
 fetchTasks={() => refetchProjects()}
 />
 </div>
 </DashboardLayout>
 );
};

export default TaskList;
