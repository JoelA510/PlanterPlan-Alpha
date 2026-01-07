import React from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants';
import SidebarSkeleton from '../atoms/SidebarSkeleton';
import InstanceList from '../molecules/InstanceList';
import JoinedProjectsList from '../molecules/JoinedProjectsList';
import TemplateList from '../molecules/TemplateList';

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
  error = null,
  onNavClick, // Injected by DashboardLayout
  // Pagination
  hasMore,
  isFetchingMore,
  onLoadMore,
}) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Simple check for admin role (assuming user.role exists from DB/Auth)
  const isAdmin = user?.role === ROLES.ADMIN;

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

  const handleGlobalNav = (path) => {
    navigate(path);
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

  const GlobalNavItem = ({ path, label, icon }) => {
    const isActive = location.pathname === path;
    return (
      <div
        className={`sidebar-nav-item group ${isActive ? 'selected' : ''}`}
        onClick={() => handleGlobalNav(path)}
        role="button"
        tabIndex={0}
      >
        <div
          className={`text-slate-400 group-hover:text-slate-600 ${isActive ? 'text-blue-600' : ''}`}
        >
          {icon}
        </div>
        <span className={`sidebar-nav-item-title ${isActive ? 'text-blue-700 font-semibold' : ''}`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-700">
      {/* Global Navigation */}
      <div className="px-4 py-4 space-y-1">
        <GlobalNavItem
          path="/dashboard"
          label="Dashboard"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          }
        />
        <GlobalNavItem
          path="/tasks"
          label="My Tasks"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />
        <GlobalNavItem
          path="/reports"
          label="Reports"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
        <GlobalNavItem
          path="/settings"
          label="Settings"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
        />
      </div>

      <div className="h-px bg-slate-100 mx-4"></div>

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
        {error && (
          <div className="p-3 mb-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <InstanceList
          tasks={instanceTasks}
          selectedTaskId={selectedTaskId}
          handleTaskClick={handleTaskClickWrapped}
          hasMore={hasMore}
          isFetchingMore={isFetchingMore}
          onLoadMore={onLoadMore}
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
  error: PropTypes.string,
  handleSelectProject: PropTypes.func.isRequired,
  selectedTaskId: PropTypes.string,
  onNewProjectClick: PropTypes.func.isRequired,
  onNewTemplateClick: PropTypes.func.isRequired,
  onNavClick: PropTypes.func,
  // Pagination
  hasMore: PropTypes.bool,
  isFetchingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

export default SideNav;
