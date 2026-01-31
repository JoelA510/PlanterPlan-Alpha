import PropTypes from 'prop-types';
import SidebarNavItem from '@features/navigation/components/SidebarNavItem';
import { FolderPlus } from 'lucide-react';

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
              className="w-full text-left px-3 py-2 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded transition-colors mt-1 font-medium"
            >
              {isFetchingMore ? 'Loading...' : 'Load More Projects...'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-muted/50 rounded-lg m-2 transition-colors border border-dashed border-border" onClick={onLoadMore}>
          <FolderPlus className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">No Projects</p>
          <p className="text-xs text-muted-foreground">Create your first project to get started.</p>
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
