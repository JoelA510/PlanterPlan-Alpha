import React from 'react';
import PropTypes from 'prop-types';
import SidebarNavItem from '../atoms/SidebarNavItem';

const InstanceList = ({
  tasks,
  selectedTaskId,
  handleTaskClick,
  hasMore,
  isFetchingMore,
  onLoadMore,
}) => {
  return (
    <div className="task-section">
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">Projects</h2>
          <span className="section-count">{tasks.length}</span>
        </div>
      </div>
      {tasks.length > 0 ? (
        <div className="sidebar-nav-list">
          {tasks.map((project) => (
            <SidebarNavItem
              key={project.id}
              task={project}
              isSelected={selectedTaskId === project.id}
              onClick={handleTaskClick}
            />
          ))}
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={isFetchingMore}
              className="w-full mt-2 py-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors flex items-center justify-center"
            >
              {isFetchingMore ? (
                <>
                  <svg className="animate-spin h-3 w-3 mr-2" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading...
                </>
              ) : (
                'Load More Projects'
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-400 px-3 py-4">
          No active projects yet. Click "New Project" to get started.
        </div>
      )}
    </div>
  );
};

InstanceList.propTypes = {
  tasks: PropTypes.array.isRequired,
  selectedTaskId: PropTypes.string,
  handleTaskClick: PropTypes.func.isRequired,
  hasMore: PropTypes.bool,
  isFetchingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

export default InstanceList;
