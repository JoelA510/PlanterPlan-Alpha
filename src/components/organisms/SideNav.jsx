import React from 'react';
import PropTypes from 'prop-types';
import JoinedProjectsList from '../molecules/JoinedProjectsList';
import InstanceList from '../molecules/InstanceList';

const SideNav = ({
  joinedProjects,
  instanceTasks,
  joinedError,
  handleTaskClick,
  selectedTaskId,
  handleEditTask,
  handleDeleteById,
  handleOpenInvite,
  handleAddChildTask,
  onNewProjectClick,
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
          handleTaskClick={handleTaskClick}
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
          handleTaskClick={handleTaskClick}
          selectedTaskId={selectedTaskId}
          handleEditTask={handleEditTask}
          handleDeleteById={handleDeleteById}
          handleOpenInvite={handleOpenInvite}
          hideExpansion={true}
        />
      </div>
    </div>
  );
};

SideNav.propTypes = {
  joinedProjects: PropTypes.array.isRequired,
  instanceTasks: PropTypes.array.isRequired,
  joinedError: PropTypes.string,
  handleTaskClick: PropTypes.func.isRequired,
  selectedTaskId: PropTypes.string,
  handleEditTask: PropTypes.func.isRequired,
  handleDeleteById: PropTypes.func.isRequired,
  handleOpenInvite: PropTypes.func.isRequired,
  handleAddChildTask: PropTypes.func.isRequired,
  onNewProjectClick: PropTypes.func.isRequired,
};

export default SideNav;
