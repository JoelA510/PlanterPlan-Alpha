import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import SideNav from '../organisms/SideNav';
import { useTaskOperations } from '../../hooks/useTaskOperations';

const SettingsPage = () => {
    const navigate = useNavigate();
    const {
        joinedProjects,
        instanceTasks,
        templateTasks,
        loading,
        error,
        joinedError,
        loadMoreProjects,
        hasMore,
        isFetchingMore
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
                <h1 className="text-2xl font-bold text-slate-800 mb-4">Settings</h1>
                <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
                    <h2 className="text-lg font-semibold mb-4">User Preferences</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded">
                            <span className="text-slate-700">Email Notifications</span>
                            <button className="px-3 py-1 bg-slate-200 text-slate-600 rounded text-sm">Enabled</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded">
                            <span className="text-slate-700">Theme</span>
                            <button className="px-3 py-1 bg-slate-200 text-slate-600 rounded text-sm">Light</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
