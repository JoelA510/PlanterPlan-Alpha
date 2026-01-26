import { Link } from 'react-router-dom';
import { TASK_STATUS } from '@app/constants/index';
import PropTypes from 'prop-types';
import RoleIndicator from '@shared/ui/RoleIndicator';

/**
 * SidebarNavItem - Lightweight navigation item for sidebar
 *
 * Checks for `to` prop to render as a semantic Link.
 */
const SidebarNavItem = ({ task, isSelected, onClick, showRole = false, to }) => {
  const handleClick = (e) => {
    // If it's a Link, let the browser handle navigation unless prevented
    // But we still want to fire 'onClick' for side effects (like closing mobile menu)
    if (onClick) {
      onClick(task);
    }
  };

  const statusClass = task.status ? `status-dot ${task.status}` : `status-dot ${TASK_STATUS.TODO}`;
  const commonClasses = `sidebar-nav-item group ${isSelected ? 'selected' : ''}`;

  const content = (
    <>
      <div className={statusClass}></div>
      <div className="flex-1 min-w-0 flex items-center justify-between">
        <span className="sidebar-nav-item-title truncate">{task.title}</span>
        <div className="flex items-center">
          {/* Clone Button (Visible on Hover) */}
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-brand-600 dark:hover:text-brand-400 transition-all mr-2"
            onClick={(e) => {
              e.preventDefault(); // Prevent navigation
              e.stopPropagation();
              // No-op for demo visual
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
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={commonClasses}
        onClick={handleClick}
        title={task.title}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={commonClasses}
      onClick={(e) => {
        e.preventDefault();
        handleClick(e);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      title={task.title}
    >
      {content}
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
  to: PropTypes.string,
};

export default SidebarNavItem;
