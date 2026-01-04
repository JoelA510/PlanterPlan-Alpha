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
