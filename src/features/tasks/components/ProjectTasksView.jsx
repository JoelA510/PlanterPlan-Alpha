import { useState } from 'react';
import PropTypes from 'prop-types';
import { useDroppable } from '@dnd-kit/core';
import { LayoutList, KanbanSquare } from 'lucide-react';
import ProjectHeader from '@features/projects/components/ProjectHeader';
import ProjectListView from './ProjectListView';
import ProjectBoardView from './board/ProjectBoardView';

/**
 * ProjectTasksView
 * Renders the children of a specific project (Root Task).
 * Supports toggling between List View and Board View.
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
  onStatusChange,
}) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'

  // Droppable for the Project Container (used in List Mode primarily, 
  // but we keep it to satisfy general DndContext expectations if needed)
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

  // Common props for task items
  const taskItemProps = {
    onTaskClick: handleTaskClick,
    selectedTaskId,
    onAddChildTask: handleAddChildTask,
    onEdit: handleEditTask,
    onDelete: handleDeleteById,
    hideExpansion: false,
    onToggleExpand,
    onStatusChange,
  };

  return (
    <div className="project-view-container px-4 sm:px-8 py-6 w-full h-full flex flex-col bg-background/30">
      {/* Header Section */}
      <div className="flex-none mb-6">
        <ProjectHeader
          project={project}
          onInviteMember={onInviteMember}
          onStatusChange={(newStatus) => onStatusChange(project.id, newStatus)}
        />

        {/* Toolbar: Actions & View Switcher */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
          <button
            onClick={() => handleAddChildTask(project)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium flex items-center transition-all shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>

          {/* View Switcher */}
          <div className="flex bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${viewMode === 'list'
                ? 'bg-card text-card-foreground shadow-sm'
                : 'text-muted-foreground hover:text-card-foreground hover:bg-muted/50'
                }`}
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${viewMode === 'board'
                ? 'bg-card text-card-foreground shadow-sm'
                : 'text-muted-foreground hover:text-card-foreground hover:bg-muted/50'
                }`}
              title="Board View"
            >
              <KanbanSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>
        </div>
      </div>

      {hydrationError && (
        <div className="flex-none mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
          {hydrationError}
        </div>
      )}

      {/* Main Content Area - Flex Grow for Board scrolling */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children.length > 0 ? (
          viewMode === 'board' ? (
            <ProjectBoardView
              project={project}
              childrenTasks={children}
              handleTaskClick={handleTaskClick}
            />
          ) : (
            <ProjectListView
              project={project}
              childrenTasks={children}
              taskItemProps={taskItemProps}
              disableDrag={disableDrag}
              setNodeRef={setNodeRef}
            />
          )
        ) : (
          <div
            ref={setNodeRef}
            className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/30 h-full flex flex-col items-center justify-center"
          >
            <p className="text-muted-foreground mb-4">No tasks in this project yet.</p>
            <button
              onClick={() => handleAddChildTask(project)}
              className="px-4 py-2 bg-card border border-border rounded-lg text-card-foreground hover:bg-muted text-sm font-medium"
            >
              Create First Task
            </button>
          </div>
        )}
      </div>
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
  onInviteMember: PropTypes.func,
  onStatusChange: PropTypes.func,
};

export default ProjectTasksView;
