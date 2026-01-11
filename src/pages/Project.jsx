import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjectWithStats } from '@features/projects/services/projectService';
import ProjectTasksView from '@features/tasks/components/ProjectTasksView';
import NewTaskForm from '@features/tasks/components/NewTaskForm';
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

  // UI Handlers (Open Modals)
  const openCreateTaskModal = (parent) => {
    setParentTask(parent);
    setActiveModal('create');
  };

  const openEditTaskModal = (task) => {
    setSelectedTask(task);
    setActiveModal('edit');
  };

  const handleDeleteTask = async (taskId) => {
    // Removed window.confirm for smoother agent interop and UX
    try {
      await deleteTask(taskId);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete task. Please try again.");
    }
  };

  // Submission Handlers
  const handleCreateSubmit = async (formData) => {
    try {
      // Determine Parent Logic
      // If parentTask is present, use its ID. If not, we are adding to the project root, so use project.id.
      // NEVER pass null here, or it becomes a new Project (Root Task).
      const targetParentId = parentTask?.id || project.id;

      await createTaskOrUpdate(formData, {
        parentId: targetParentId,
        origin: project.origin,
        mode: 'create'
      });

      setActiveModal(null);
    } catch (error) {
      console.error("Create failed:", error);
      throw error; // Let NewTaskForm handle the error state
    }
  };

  const handleEditSubmit = async (formData) => {
    try {
      if (!selectedTask) return;

      await createTaskOrUpdate(formData, {
        taskId: selectedTask.id,
        parentId: selectedTask.parent_task_id,
        origin: project.origin,
        mode: 'edit'
      });

      setActiveModal(null);
    } catch (error) {
      console.error("Edit failed:", error);
      throw error;
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
        handleTaskClick={openEditTaskModal} // Clicking a task opens edit
        handleAddChildTask={openCreateTaskModal}
        handleEditTask={openEditTaskModal}
        handleDeleteById={handleDeleteTask}
        selectedTaskId={selectedTask?.id}
        onToggleExpand={() => { }}
        onInviteMember={() => setActiveModal('invite')}
        onStatusChange={handleStatusChange}
      />

      {/* Modals */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-6 text-xl font-bold text-slate-900">
              {parentTask && parentTask.id !== project.id ? `Add Subtask to "${parentTask.title}"` : 'Add New Task'}
            </h2>
            <NewTaskForm
              parentTask={parentTask}
              origin={project.origin}
              onSubmit={handleCreateSubmit}
              onCancel={() => setActiveModal(null)}
              submitLabel="Create Task"
            />
          </div>
        </div>
      )}

      {activeModal === 'edit' && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-6 text-xl font-bold text-slate-900">Edit Task</h2>
            <NewTaskForm
              initialTask={selectedTask}
              parentTask={null} // We don't change parent during edit currently
              origin={project.origin}
              onSubmit={handleEditSubmit}
              onCancel={() => setActiveModal(null)}
              submitLabel="Save Changes"
            />
          </div>
        </div>
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
