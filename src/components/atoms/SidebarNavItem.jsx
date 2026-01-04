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

  return (
    <div
      className={`sidebar-nav-item ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e);
        }
      }}
    >
      <span className="sidebar-nav-item-title">{task.title}</span>
      {showRole && task.membership_role && <RoleIndicator role={task.membership_role} />}
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
