import PropTypes from 'prop-types';
import { FolderPlus } from 'lucide-react';
import { PROJECT_STATUS_COLORS } from '@app/constants/colors';
import { PROJECT_STATUS } from '@app/constants/index';

const InstanceList = ({
  tasks,
  selectedTaskId,
  handleTaskClick,
  hasMore,
  isFetchingMore,
  onLoadMore,
}) => {
  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">My Projects</h2>
        </div>
        <span className="bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
          {tasks.length}
        </span>
      </div>

      {tasks.length > 0 ? (
        <>
          {tasks.map((task) => {
            const isSelected = selectedTaskId === task.id;

            return (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={`
                  group relative p-3 rounded-lg border transition-all duration-200 cursor-pointer w-full text-left
                  ${isSelected
                    ? 'bg-brand-50 dark:bg-slate-800/80 border-brand-200 dark:border-slate-700 shadow-sm'
                    : 'bg-card border-border hover:border-brand-300 dark:hover:border-slate-700 hover:shadow-md'
                  }
                `}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTaskClick(task);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2 w-full">
                  <h3 className={`font-semibold text-sm line-clamp-1 break-all ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-foreground'}`}>
                    {task.title}
                  </h3>
                  {/* Settings Action (Visible on Hover) */}
                  <button
                    className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all ${isSelected ? 'text-brand-600 hover:bg-brand-100' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Future: Open project settings modal
                    }}
                    title="Project Settings"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <div className={`
                    text-[10px] px-2 py-0.5 rounded-full font-medium border uppercase tracking-wide
                    ${(PROJECT_STATUS_COLORS[task.status] || PROJECT_STATUS_COLORS[PROJECT_STATUS.PLANNING]).bg}
                    ${(PROJECT_STATUS_COLORS[task.status] || PROJECT_STATUS_COLORS[PROJECT_STATUS.PLANNING]).text}
                    ${(PROJECT_STATUS_COLORS[task.status] || PROJECT_STATUS_COLORS[PROJECT_STATUS.PLANNING]).border}
                  `}>
                    {task.status ? task.status.replace('_', ' ') : 'Planning'}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={isFetchingMore}
              className="w-full py-2 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline disabled:opacity-50 text-center mt-2"
            >
              {isFetchingMore ? 'Loading...' : 'Load More Projects'}
            </button>
          )}
        </>
      ) : (
        !isFetchingMore && (
          <div className="flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-muted/50 rounded-lg m-2 transition-colors border border-dashed border-border group" onClick={onLoadMore}>
            <FolderPlus className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-brand-500 transition-colors" />
            <p className="text-sm font-medium text-foreground">No Projects</p>
            <p className="text-xs text-muted-foreground">Create your first project to get started.</p>
          </div>
        )
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
