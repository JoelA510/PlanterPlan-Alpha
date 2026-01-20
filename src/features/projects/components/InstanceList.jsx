import PropTypes from 'prop-types';
import SidebarNavItem from '@features/navigation/components/SidebarNavItem';

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
          <h2 className="section-title">My Projects</h2>
          <span className="section-count">{tasks.length}</span>
        </div>
      </div>
      {tasks.length > 0 ? (
        <div className="sidebar-nav-list">
          {tasks.map((task) => (
            <SidebarNavItem
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              onClick={handleTaskClick}
              to={`/project/${task.id}`}
            />
          ))}
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={isFetchingMore}
              className="w-full text-left px-3 py-2 text-xs text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded transition-colors mt-1 font-medium"
            >
              {isFetchingMore ? 'Loading...' : 'Load More Projects...'}
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-400 px-3 py-4">
          No projects yet. Click &quot;New Project&quot; to start.
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
