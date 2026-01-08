import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@layouts/DashboardLayout';
import SideNav from '@features/navigation/components/SideNav';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import EmptyState from '@shared/ui/EmptyState';

const TasksPage = () => {
  const navigate = useNavigate();
  const {
    joinedProjects = [],
    instanceTasks = [],
    templateTasks = [],
    loading,
    error,
    joinedError,
    loadMoreProjects,
    hasMore,
    isFetchingMore,
  } = useTaskOperations();

  const handleSelectProject = (project) => {
    // Navigate to project view
    navigate(`/project/${project.id}`);
  };

  const sidebar = (
    <SideNav
      joinedProjects={joinedProjects}
      instanceTasks={instanceTasks}
      templateTasks={templateTasks}
      loading={loading}
      error={error}
      joinedError={joinedError}
      handleSelectProject={handleSelectProject}
      onNewProjectClick={() => navigate('/dashboard')}
      onNewTemplateClick={() => navigate('/dashboard')}
      onLoadMore={loadMoreProjects}
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Tasks</h1>
        <EmptyState
          title="Aggregated Tasks View"
          description="We are building a unified view to see all your tasks across every project in one place. Stay tuned for updates!"
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/dashboard')}
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>
    </DashboardLayout>
  );
};

export default TasksPage;
