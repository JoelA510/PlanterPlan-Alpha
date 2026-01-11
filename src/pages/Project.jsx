import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjectWithStats } from '@features/projects/services/projectService';
import ProjectTasksView from '@features/tasks/components/ProjectTasksView';
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
    loading: navLoading
  } = useTaskOperations();

  // Handlers for SideNav
  const handleSelectProject = (project) => navigate(`/project/${project.id}`);
  const handleNewProjectClick = () => navigate('/dashboard'); // Redirect to dashboard for creation
  const handleNewTemplateClick = () => { };


  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProjectWithStats(id),
    enabled: !authLoading && !!user && !!id,
  });

  const project = projectData?.data;

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

  // Handlers (Minimal implementation for View-Only / Basic Interaction)
  const handleTaskClick = (task) => console.log('Task clicked:', task);
  const handleAddChildTask = (parent) => console.log('Add child to:', parent);
  const handleEditTask = (task) => console.log('Edit task:', task);
  const handleDeleteById = (id) => console.log('Delete task:', id);

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
        handleTaskClick={handleTaskClick}
        handleAddChildTask={handleAddChildTask}
        handleEditTask={handleEditTask}
        handleDeleteById={handleDeleteById}
        selectedTaskId={null}
        onToggleExpand={() => { }}
        onInviteMember={() => console.log('Invite member')}
        onStatusChange={() => { }}
      />
    </DashboardLayout>
  );
}
