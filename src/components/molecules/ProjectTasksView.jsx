import React from 'react';
import PropTypes from 'prop-types';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableTaskItem } from '../molecules/TaskItem';

/**
 * ProjectTasksView
 * Renders the children of a specific project (Root Task) as the main content.
 */
const ProjectTasksView = ({
  project,
  handleTaskClick,
  handleAddChildTask,
  handleOpenInvite,
  handleEditTask,
  handleDeleteById,
  selectedTaskId,
  onToggleExpand,
}) => {
  const { setNodeRef } = useDroppable({
    id: `project-view-${project.id}`,
    data: {
      type: 'container',
      parentId: project.id,
      origin: project.origin,
    },
  });

  const children = project.children || [];

  return (
    <div className="project-view-container p-6 w-full max-w-5xl mx-auto">
      <div className="project-header mb-8">
        <h1 className="text-3xl font-bold text-slate-800">{project.title}</h1>
        {project.description && <p className="text-slate-600 mt-2">{project.description}</p>}
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => handleAddChildTask(project)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Task
          </button>
          {/* Additional project-level actions can go here */}
        </div>
      </div>

      {children.length > 0 ? (
        <SortableContext
          items={children.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          id={`sortable-project-${project.id}`}
        >
          <div ref={setNodeRef} className="task-cards-container space-y-2">
            {children.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                level={0} // Reset level to 0 for the view, or 1? logic says 0 relative to view
                onTaskClick={handleTaskClick}
                selectedTaskId={selectedTaskId}
                onAddChildTask={handleAddChildTask}
                onInviteMember={handleOpenInvite}
                onEdit={handleEditTask}
                onDelete={handleDeleteById}
                // We show expansion here because this is the task tree
                hideExpansion={false}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </div>
        </SortableContext>
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
  handleOpenInvite: PropTypes.func.isRequired,
  handleEditTask: PropTypes.func.isRequired,
  handleDeleteById: PropTypes.func.isRequired,
  selectedTaskId: PropTypes.string,
  onToggleExpand: PropTypes.func,
};

export default ProjectTasksView;
