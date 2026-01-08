import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@layouts/DashboardLayout';
import SideNav from '@features/navigation/components/SideNav';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import EmptyState from '@shared/ui/EmptyState';

const ReportsPage = () => {
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
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Reports</h1>
        <EmptyState
          title="Consolidated Reports"
          description="View progress, resource allocation, and team performance across your entire organization. Advanced analytics are on the roadmap."
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
