import React from 'react';
import PropTypes from 'prop-types';
import JoinedProjectsList from '../molecules/JoinedProjectsList';
import InstanceList from '../molecules/InstanceList';
import TemplateList from '../molecules/TemplateList';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants';
import SidebarSkeleton from '../atoms/SidebarSkeleton';

const SideNav = ({
  joinedProjects,
  instanceTasks,
  templateTasks,
  joinedError,
  handleSelectProject,
  selectedTaskId,
  onNewProjectClick,
  onNewTemplateClick,
  loading = false,
  onNavClick, // Injected by DashboardLayout
}) => {
  const { user, signOut } = useAuth();
  // Simple check for admin role (assuming user.role exists from DB/Auth)
  const isAdmin = user?.role === ROLES.ADMIN || user?.email?.includes('@admin'); // Fallback logic if role missing

  const handleTaskClickWrapped = (task) => {
    handleSelectProject(task);
    if (onNavClick) onNavClick();
  };

  const handleNewProject = () => {
    onNewProjectClick();
    if (onNavClick) onNavClick();
  };

  const handleNewTemplate = () => {
    onNewTemplateClick();
    if (onNavClick) onNavClick();
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <SidebarSkeleton />
      </div>
    );
  }

  // Safe access for user initials
  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <div className="flex flex-col h-full bg-white text-slate-700">
      {/* Top Actions Area */}
      {isAdmin && (
        <div className="px-4 py-4 space-y-2 border-b border-slate-100">
          <button
            onClick={handleNewProject}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Project
          </button>
          <button
            onClick={handleNewTemplate}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            New Template
          </button>
        </div>
      )}

      {/* Main Navigation Lists (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
        <InstanceList
          tasks={instanceTasks}
          selectedTaskId={selectedTaskId}
          handleTaskClick={handleTaskClickWrapped}
        />

        <div className="h-px bg-slate-100"></div>

        <JoinedProjectsList
          projects={joinedProjects}
          error={joinedError}
          handleTaskClick={handleTaskClickWrapped}
          selectedTaskId={selectedTaskId}
        />

        <div className="h-px bg-slate-100"></div>

        <TemplateList
          tasks={templateTasks}
          selectedTaskId={selectedTaskId}
          handleTaskClick={handleTaskClickWrapped}
        />
      </div>

      {/* User Profile Section (Bottom) */}
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.email || 'Unknown User'}
            </p>
            <button
              onClick={signOut}
              className="text-xs text-slate-500 hover:text-red-600 hover:underline transition-colors flex items-center mt-0.5"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

SideNav.propTypes = {
  joinedProjects: PropTypes.array.isRequired,
  instanceTasks: PropTypes.array.isRequired,
  templateTasks: PropTypes.array.isRequired,
  joinedError: PropTypes.string,
  handleSelectProject: PropTypes.func.isRequired,
  selectedTaskId: PropTypes.string,
  onNewProjectClick: PropTypes.func.isRequired,
  onNewTemplateClick: PropTypes.func.isRequired,
  onNavClick: PropTypes.func,
};

export default SideNav;
