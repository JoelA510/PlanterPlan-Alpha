import React from 'react';
import PropTypes from 'prop-types';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableTaskItem } from '../molecules/TaskItem';

const TemplateList = ({
  tasks,
  selectedTaskId,
  handleTaskClick,
  handleAddChildTask,
  handleEditTask,
  handleDeleteById,
  onNewTemplateClick,
  hideExpansion = false,
}) => {
  const { setNodeRef } = useDroppable({
    id: 'drop-root-template',
    data: { type: 'container', parentId: null, origin: 'template' },
  });

  return (
    <div className="task-section">
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">Templates</h2>
          <span className="section-count">{tasks.length}</span>
        </div>
        <button onClick={onNewTemplateClick} className="btn-new-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
          </svg>
          New Template
        </button>
      </div>
      {tasks.length > 0 ? (
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          id="root-template"
        >
          <div ref={setNodeRef} className="task-cards-container">
            {tasks.map((template) => (
              <SortableTaskItem
                key={template.id}
                task={template}
                level={0}
                onTaskClick={handleTaskClick}
                selectedTaskId={selectedTaskId}
                onAddChildTask={handleAddChildTask}
                onEdit={handleEditTask}
                onDelete={handleDeleteById}
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
          No templates yet. Use "New Template" to start building your reusable library.
        </div>
      )}
    </div>
  );
};

TemplateList.propTypes = {
  tasks: PropTypes.array.isRequired,
  selectedTaskId: PropTypes.string,
  handleTaskClick: PropTypes.func.isRequired,
  handleAddChildTask: PropTypes.func.isRequired,
  handleEditTask: PropTypes.func.isRequired,
  handleDeleteById: PropTypes.func.isRequired,
  onNewTemplateClick: PropTypes.func.isRequired,
  hideExpansion: PropTypes.bool,
};

export default TemplateList;
