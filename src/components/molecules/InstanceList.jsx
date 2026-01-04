import React from 'react';
import PropTypes from 'prop-types';
import SidebarNavItem from '../atoms/SidebarNavItem';

const InstanceList = ({ tasks, selectedTaskId, handleTaskClick, onNewProjectClick }) => {
  return (
    <div className="task-section">
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">Projects</h2>
          <span className="section-count">{tasks.length}</span>
        </div>
        <button onClick={onNewProjectClick} className="btn-new-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
          </svg>
          New Project
        </button>
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
  onNewProjectClick: PropTypes.func.isRequired,
};

export default InstanceList;
