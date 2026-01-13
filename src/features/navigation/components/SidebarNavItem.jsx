import { TASK_STATUS } from '@app/constants/index';
import PropTypes from 'prop-types';
import RoleIndicator from '@shared/ui/RoleIndicator';

/**
 * SidebarNavItem - Lightweight navigation item for sidebar
 *
 * Unlike TaskItem, this component only handles navigation,
 * without status controls, drag-and-drop, or action buttons.
 */
const SidebarNavItem = ({ task, isSelected, onClick, showRole = false }) => {
  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) {
      onClick(task);
    }
  };

  const statusClass = task.status ? `status-dot ${task.status}` : `status-dot ${TASK_STATUS.TODO}`;

  return (
    <div
      className={`sidebar-nav-item group ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onClick) onClick(task);
        }
      }}
      title={task.title}
    >
      <div className={statusClass}></div>
      <div className="flex-1 min-w-0 flex items-center justify-between">
        <span className="sidebar-nav-item-title truncate">{task.title}</span>
        <div className="flex items-center">
          {/* Clone Button (Visible on Hover) */}
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-brand-600 transition-all mr-2"
            onClick={(e) => {
              e.stopPropagation();
              // No-op for demo visual, or wire up if needed later
              // No-op for demo visual, or wire up if needed later
            }}
            title="Clone Template"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V5a2 2 0 012-2h4.586"
              />
            </svg>
          </button>

          {showRole && task.membership_role && (
            <div className="flex-shrink-0">
              <RoleIndicator role={task.membership_role} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

SidebarNavItem.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    membership_role: PropTypes.string,
  }).isRequired,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  showRole: PropTypes.bool,
};

export default SidebarNavItem;
