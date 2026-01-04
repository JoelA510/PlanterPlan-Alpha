import React from 'react';
import PropTypes from 'prop-types';
import JoinedProjectsList from '../molecules/JoinedProjectsList';
import InstanceList from '../molecules/InstanceList';
import TemplateList from '../molecules/TemplateList';

const SideNav = ({
  joinedProjects,
  instanceTasks,
  templateTasks,
  joinedError,
  handleSelectProject,
  selectedTaskId,
  onNewProjectClick,
  onNewTemplateClick,
}) => {
  return (
    <div className="side-nav">
      <div className="side-nav-header">
        <button onClick={onNewProjectClick} className="btn-new-item justify-center w-full py-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
          </svg>
          New Project
        </button>
        <button onClick={onNewTemplateClick} className="btn-new-item justify-center w-full py-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
          </svg>
          New Template
        </button>
      </div>

      <div className="side-nav-content">
        <InstanceList
          tasks={instanceTasks}
          selectedTaskId={selectedTaskId}
          handleTaskClick={handleSelectProject}
          onNewProjectClick={onNewProjectClick}
        />

        <div className="side-nav-divider"></div>

        <JoinedProjectsList
          projects={joinedProjects}
          error={joinedError}
          handleTaskClick={handleSelectProject}
          selectedTaskId={selectedTaskId}
        />

        <div className="side-nav-divider"></div>

        <TemplateList
          tasks={templateTasks}
          selectedTaskId={selectedTaskId}
          handleTaskClick={handleSelectProject}
          onNewTemplateClick={onNewTemplateClick}
        />
      </div>
    </div>
  );
};

SideNav.propTypes = {
  joinedProjects: PropTypes.array.isRequired,
  instanceTasks: PropTypes.array.isRequired,
  templateTasks: PropTypes.array.isRequired,
  joinedError: PropTypes.string,
  handleSelectProject: PropTypes.func.isRequired,
  selectedTaskId: PropTypes.string,
  onNewProjectClick: PropTypes.func.isRequired,
  onNewTemplateClick: PropTypes.func.isRequired,
};

export default SideNav;
