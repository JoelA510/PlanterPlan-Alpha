import React from 'react';
import PropTypes from 'prop-types';
import RoleIndicator from './RoleIndicator';

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

  const statusClass = task.status ? `status-dot ${task.status}` : 'status-dot todo';

  return (
    <div
      className={`sidebar-nav-item ${isSelected ? 'selected' : ''}`}
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
        {showRole && task.membership_role && (
          <div className="ml-2 flex-shrink-0">
            <RoleIndicator role={task.membership_role} />
          </div>
        )}
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
