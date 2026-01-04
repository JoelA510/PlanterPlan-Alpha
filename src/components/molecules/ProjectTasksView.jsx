import React from 'react';
import PropTypes from 'prop-types';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskItem, { SortableTaskItem } from '../molecules/TaskItem';
import ProjectHeader from '../molecules/ProjectHeader';

/**
 * ProjectTasksView
 * Renders the children of a specific project (Root Task) as the main content.
 * When disableDrag is true (e.g., for joined projects), tasks are not sortable.
 */
const ProjectTasksView = ({
  project,
  handleTaskClick,
  handleAddChildTask,
  handleEditTask,
  handleDeleteById,
  selectedTaskId,
  onToggleExpand,
  disableDrag = false,
  hydrationError = null,
  onInviteMember,
}) => {
  const { setNodeRef } = useDroppable({
    id: `project-view-${project.id}`,
    data: {
      type: 'container',
      parentId: project.id,
      origin: project.origin,
    },
    disabled: disableDrag,
  });

  const children = project.children || [];

  // Common props for task items (children of the project)
  // Note: onInviteMember is intentionally omitted - invites should only be on project root
  const taskItemProps = {
    onTaskClick: handleTaskClick,
    selectedTaskId,
    onAddChildTask: handleAddChildTask,
    onEdit: handleEditTask,
    onDelete: handleDeleteById,
    hideExpansion: false,
    onToggleExpand,
  };

  const renderTaskList = () => {
    if (disableDrag) {
      // Render without sorting for joined projects
      return (
        <div ref={setNodeRef} className="task-cards-container space-y-2">
          {children.map((task) => (
            <TaskItem key={task.id} task={task} level={0} {...taskItemProps} />
          ))}
        </div>
      );
    }

    // Render with sorting for owned projects
    return (
      <SortableContext
        items={children.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
        id={`sortable-project-${project.id}`}
      >
        <div ref={setNodeRef} className="task-cards-container space-y-2">
          {children.map((task) => (
            <SortableTaskItem key={task.id} task={task} level={0} {...taskItemProps} />
          ))}
        </div>
      </SortableContext>
    );
  };

  return (
    <div className="project-view-container p-6 w-full max-w-5xl mx-auto">
      {/* Replaces simple header with rich ProjectHeader */}
      <div className="mr-8">
        <ProjectHeader project={project} onInviteMember={onInviteMember} />
      </div>

      {/* Action Bar (Below Header) */}
      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => handleAddChildTask(project)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center transition-all shadow-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      {hydrationError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {hydrationError}
        </div>
      )}

      {children.length > 0 ? (
        renderTaskList()
      ) : (
        <div
          ref={setNodeRef}
          className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50"
        >
          <p className="text-slate-500 mb-4">No tasks in this project yet.</p>
          <button
            onClick={() => handleAddChildTask(project)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium"
          >
            Create First Task
          </button>
        </div>
      )}
    </div>
  );
};

ProjectTasksView.propTypes = {
  project: PropTypes.object.isRequired,
  handleTaskClick: PropTypes.func.isRequired,
  handleAddChildTask: PropTypes.func.isRequired,
  handleEditTask: PropTypes.func.isRequired,
  handleDeleteById: PropTypes.func.isRequired,
  selectedTaskId: PropTypes.string,
  onToggleExpand: PropTypes.func,
  disableDrag: PropTypes.bool,
  hydrationError: PropTypes.string,
  onInviteMember: PropTypes.func, // Optional, for invite flow
};

export default ProjectTasksView;
