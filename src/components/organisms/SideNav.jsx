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
  handleEditTask,
  handleDeleteById,
  handleOpenInvite,
  handleAddChildTask,
  onNewProjectClick,
  onNewTemplateClick,
}) => {
  return (
    <div className="side-nav">
      <div className="side-nav-header">
        <h1 className="app-title">PlanterPlan</h1>
      </div>

      <div className="side-nav-content">
        <InstanceList
          tasks={instanceTasks}
          selectedTaskId={selectedTaskId}
          handleTaskClick={handleSelectProject}
          handleAddChildTask={handleAddChildTask}
          handleOpenInvite={handleOpenInvite}
          handleEditTask={handleEditTask}
          handleDeleteById={handleDeleteById}
          onNewProjectClick={onNewProjectClick}
          hideExpansion={true}
        />

        <div className="side-nav-divider"></div>

        <JoinedProjectsList
          projects={joinedProjects}
          error={joinedError}
          handleTaskClick={handleSelectProject}
          selectedTaskId={selectedTaskId}
          handleEditTask={handleEditTask}
          handleDeleteById={handleDeleteById}
          handleOpenInvite={handleOpenInvite}
          hideExpansion={true}
        />

        <div className="side-nav-divider"></div>

        <TemplateList
          tasks={templateTasks}
          selectedTaskId={selectedTaskId}
          handleTaskClick={handleSelectProject}
          handleAddChildTask={handleAddChildTask}
          handleEditTask={handleEditTask}
          handleDeleteById={handleDeleteById}
          onNewTemplateClick={onNewTemplateClick}
          hideExpansion={true}
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
  handleEditTask: PropTypes.func.isRequired,
  handleDeleteById: PropTypes.func.isRequired,
  handleOpenInvite: PropTypes.func.isRequired,
  handleAddChildTask: PropTypes.func.isRequired,
  onNewProjectClick: PropTypes.func.isRequired,
  onNewTemplateClick: PropTypes.func.isRequired,
};

export default SideNav;
