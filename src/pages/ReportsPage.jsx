import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@layouts/DashboardLayout';
import SideNav from '@features/navigation/components/SideNav';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';

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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Global Reports</h1>
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <p className="text-slate-600">Organization-wide reporting and analytics coming soon.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
