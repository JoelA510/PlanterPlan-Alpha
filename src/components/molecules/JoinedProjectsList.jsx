import React from 'react';
import PropTypes from 'prop-types';
import TaskItem from '../molecules/TaskItem';

const JoinedProjectsList = ({
  projects,
  error,
  handleTaskClick,
  selectedTaskId,
  handleOpenInvite,
  hideExpansion = false,
}) => {
  return (
    <div className="task-section">
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">Joined Projects</h2>
          <span className="section-count">{projects.length}</span>
        </div>
      </div>
      {error ? (
        <div className="text-sm text-red-600 px-4 py-8 border border-red-200 bg-red-50 rounded-lg">
          {error}
        </div>
      ) : projects.length > 0 ? (
        <div className="task-cards-container">
          {projects.map((project) => (
            <TaskItem
              key={project.id}
              task={project}
              level={0}
              onTaskClick={handleTaskClick}
              selectedTaskId={selectedTaskId}
              onAddChildTask={undefined}
              onEdit={undefined}
              onDelete={undefined}
              onInviteMember={project.membership_role === 'owner' ? handleOpenInvite : undefined}
              hideExpansion={hideExpansion}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-500 px-4 py-8 border border-dashed border-slate-200 rounded-lg">
          You haven't joined any projects yet.
        </div>
      )}
    </div>
  );
};

JoinedProjectsList.propTypes = {
  projects: PropTypes.array.isRequired,
  error: PropTypes.string,
  handleTaskClick: PropTypes.func.isRequired,
  selectedTaskId: PropTypes.string,
  handleOpenInvite: PropTypes.func.isRequired,
  hideExpansion: PropTypes.bool,
};

export default JoinedProjectsList;
