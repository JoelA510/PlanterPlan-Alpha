import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjectWithStats } from '@features/projects/services/projectService';
import ProjectTasksView from '@features/tasks/components/ProjectTasksView';
import CreateTaskForm from '@features/tasks/components/CreateTaskForm';
import EditTaskForm from '@features/tasks/components/EditTaskForm';
import InviteMemberModal from '@features/projects/components/InviteMemberModal';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@app/contexts/AuthContext';
import DashboardLayout from '@layouts/DashboardLayout';
import SideNav from '@features/navigation/components/SideNav';
import { useNavigate } from 'react-router-dom';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';

export default function Project() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Navigation Data
  const {
    instanceTasks,
    templateTasks,
    joinedProjects,
    loading: navLoading,
    updateTask,
    deleteTask,
    createTaskOrUpdate
  } = useTaskOperations();

  // Handlers for SideNav
  const handleSelectProject = (project) => navigate(`/project/${project.id}`);
  const handleNewProjectClick = () => navigate('/dashboard'); // Redirect to dashboard for creation
  const handleNewTemplateClick = () => { };

  // Task/Project Mutation Handlers
  // const { updateTask } = useTaskOperations(); // OLD
  // We will access these in the return statement or merge them if needed. 
  // Actually, let's just delete this line and let the render block handle it, 
  // BUT handleStatusChange relies on it. 
  // So let's consolidate.

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProjectWithStats(id),
    enabled: !authLoading && !!user && !!id,
  });

  const project = projectData?.data;

  // Modal State
  const [activeModal, setActiveModal] = React.useState(null); // 'create' | 'edit' | 'invite'
  const [selectedTask, setSelectedTask] = React.useState(null);
  const [parentTask, setParentTask] = React.useState(null);

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout sidebar={<SideNav
        instanceTasks={instanceTasks}
        templateTasks={templateTasks}
        joinedProjects={joinedProjects}
        handleSelectProject={handleSelectProject}
        onNewProjectClick={handleNewProjectClick}
        onNewTemplateClick={handleNewTemplateClick}
        loading={navLoading}
      />}>
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900">Project not found</h2>
            <p className="text-slate-500 mt-2">{error?.message || "We couldn't locate this project."}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Handlers
  const handleAddChildTask = (parent) => {
    setParentTask(parent);
    setActiveModal('create');
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setActiveModal('edit');
  };

  const handleDeleteById = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (e) { console.error(e); }
    }
  };

  return (
    <DashboardLayout sidebar={<SideNav
      instanceTasks={instanceTasks}
      templateTasks={templateTasks}
      joinedProjects={joinedProjects}
      handleSelectProject={handleSelectProject}
      onNewProjectClick={handleNewProjectClick}
      onNewTemplateClick={handleNewTemplateClick}
      loading={navLoading}
    />}>
      <ProjectTasksView
        project={project}
        handleTaskClick={handleEditTask} // Clicking a task opens edit
        handleAddChildTask={handleAddChildTask}
        handleEditTask={handleEditTask}
        handleDeleteById={handleDeleteById}
        selectedTaskId={selectedTask?.id}
        onToggleExpand={() => { }}
        onInviteMember={() => setActiveModal('invite')}
        onStatusChange={handleStatusChange}
      />

      {/* Modals */}
      {activeModal === 'create' && (
        <CreateTaskForm
          open={true}
          onClose={() => setActiveModal(null)}
          parentId={parentTask?.id}
          rootId={project.id}
          origin={project.origin}
          onSuccess={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'edit' && selectedTask && (
        <EditTaskForm
          open={true}
          onClose={() => setActiveModal(null)}
          task={selectedTask}
          onSuccess={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'invite' && (
        <InviteMemberModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          project={project}
        />
      )}
    </DashboardLayout>
  );
}
