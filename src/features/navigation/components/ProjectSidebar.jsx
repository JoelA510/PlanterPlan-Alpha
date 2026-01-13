
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@app/contexts/AuthContext';
import { ROLES } from '@app/constants/index';
import SidebarSkeleton from '@features/navigation/components/SidebarSkeleton';
import InstanceList from '@features/projects/components/InstanceList';
import JoinedProjectsList from '@features/projects/components/JoinedProjectsList';
import TemplateList from '@features/library/components/TemplateList';
import { LayoutDashboard, CheckSquare, BarChart, Settings } from 'lucide-react';
import GlobalNavItem from './GlobalNavItem';

const ProjectSidebar = ({
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

  return (
    <div className="flex flex-col h-full bg-white text-slate-700">
      {/* Global Navigation */}
      <div className="px-4 py-4 space-y-1">
        <GlobalNavItem
          label="Dashboard"
          isActive={location.pathname === '/dashboard'}
          onClick={() => handleGlobalNav('/dashboard')}
          icon={<LayoutDashboard className="w-5 h-5" />}
        />
        <GlobalNavItem
          label="My Tasks"
          isActive={location.pathname === '/tasks'}
          onClick={() => handleGlobalNav('/tasks')}
          icon={<CheckSquare className="w-5 h-5" />}
        />
        <GlobalNavItem
          label="Reports"
          isActive={location.pathname === '/reports'}
          onClick={() => handleGlobalNav('/reports')}
          icon={<BarChart className="w-5 h-5" />}
        />
        <GlobalNavItem
          label="Settings"
          isActive={location.pathname === '/settings'}
          onClick={() => handleGlobalNav('/settings')}
          icon={<Settings className="w-5 h-5" />}
        />
      </div>

      <div className="h-px bg-slate-100 mx-4"></div>

      {/* Top Actions Area */}
      {isAdmin && (
        <div className="px-4 py-4 space-y-2 border-b border-slate-100">
          <button
            onClick={handleNewProject}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
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
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
          >
            New Template
          </button>
        </div>
      )}

      {/* Main Navigation Lists (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
        {error && (
          <div className="p-3 mb-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
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
          <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold border border-brand-200">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.email || 'Unknown User'}
            </p>
            <button
              onClick={signOut}
              className="text-xs text-slate-500 hover:text-rose-600 hover:underline transition-colors flex items-center mt-0.5"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ProjectSidebar.propTypes = {
  joinedProjects: PropTypes.array.isRequired,
  instanceTasks: PropTypes.array.isRequired,
  templateTasks: PropTypes.array.isRequired,
  joinedError: PropTypes.string,
  error: PropTypes.string,
  handleSelectProject: PropTypes.func.isRequired,
  selectedTaskId: PropTypes.string,
  onNewProjectClick: PropTypes.func.isRequired,
  onNewTemplateClick: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  onNavClick: PropTypes.func,
  // Pagination
  hasMore: PropTypes.bool,
  isFetchingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

export default ProjectSidebar;
