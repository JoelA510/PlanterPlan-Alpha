import React from 'react';
import PropTypes from 'prop-types';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableTaskItem } from '../molecules/TaskItem';

const InstanceList = ({
  tasks,
  selectedTaskId,
  handleTaskClick,
  handleAddChildTask,
  handleOpenInvite,
  handleEditTask: _handleEditTask,
  handleDeleteById: _handleDeleteById,
  onNewProjectClick,
  hideExpansion = false,
}) => {
  const { setNodeRef } = useDroppable({
    id: 'drop-root-instance',
    data: { type: 'container', parentId: null, origin: 'instance' },
  });

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
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          id="root-instance"
        >
          <div ref={setNodeRef} className="task-cards-container">
            {tasks.map((project) => (
              <SortableTaskItem
                key={project.id}
                task={project}
                level={0}
                onTaskClick={handleTaskClick}
                selectedTaskId={selectedTaskId}
                onAddChildTask={handleAddChildTask}
                onInviteMember={handleOpenInvite}
                onEdit={undefined}
                onDelete={undefined}
                hideExpansion={hideExpansion}
              />
            ))}
          </div>
        </SortableContext>
      ) : (
        <div
          ref={setNodeRef}
          className="text-sm text-slate-500 px-4 py-8 border border-dashed border-slate-200 rounded-lg"
        >
          No active projects yet. Use "New Project" to get started.
        </div>
      )}
    </div>
  );
};

InstanceList.propTypes = {
  tasks: PropTypes.array.isRequired,
  selectedTaskId: PropTypes.string,
  handleTaskClick: PropTypes.func.isRequired,
  handleAddChildTask: PropTypes.func.isRequired,
  handleOpenInvite: PropTypes.func.isRequired,
  handleEditTask: PropTypes.func.isRequired,
  handleDeleteById: PropTypes.func.isRequired,
  onNewProjectClick: PropTypes.func.isRequired,
  hideExpansion: PropTypes.bool,
};

export default InstanceList;
