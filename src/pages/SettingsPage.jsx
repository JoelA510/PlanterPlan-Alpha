import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@layouts/DashboardLayout';
import SideNav from '@features/navigation/components/SideNav';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import EmptyState from '@shared/ui/EmptyState';

const SettingsPage = () => {
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

  if (loading) {
    return (
      <DashboardLayout sidebar={sidebar}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-slate-100 rounded-xl border border-slate-200"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
        <EmptyState
          title="Global Settings"
          description="Manage your account preferences, notification settings, and workspace configuration."
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
