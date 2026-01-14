import PropTypes from 'prop-types';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskItem, { SortableTaskItem } from '@features/tasks/components/TaskItem';

const ProjectListView = ({
    project,
    childrenTasks,
    taskItemProps,
    disableDrag,

}) => {
    // We can use useDroppable here locally if we want the "droppable container" to be the list view itself
    // But ProjectBoardView will have its own droppables (columns).
    // The parent ProjectTasksView used useDroppable for the whole project ID. 
    // Let's keep the droppable logic inside the specific views if possible, or pass the ref down.
    // In the original code, useDroppable was on ProjectTasksView.
    // Ideally, ProjectListView is the droppable container for "List Mode".

    const { setNodeRef: listDropRef } = useDroppable({
        id: `project-view-${project.id}-list`,
        data: {
            type: 'container',
            parentId: project.id,
            origin: project.origin,
            view: 'list'
        },
        disabled: disableDrag,
    });

    if (disableDrag) {
        return (
            <div ref={listDropRef} className="task-cards-container space-y-2">
                {childrenTasks.map((task) => (
                    <TaskItem key={task.id} task={task} level={0} {...taskItemProps} />
                ))}
            </div>
        );
    }

    return (
        <SortableContext
            items={childrenTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
            id={`sortable-project-${project.id}`}
        >
            <div ref={listDropRef} className="task-cards-container space-y-2">
                {childrenTasks.map((task) => (
                    <SortableTaskItem key={task.id} task={task} level={0} {...taskItemProps} />
                ))}
            </div>
        </SortableContext>
    );
};

ProjectListView.propTypes = {
    project: PropTypes.object.isRequired,
    childrenTasks: PropTypes.array.isRequired,
    taskItemProps: PropTypes.object.isRequired,
    disableDrag: PropTypes.bool,
};

export default ProjectListView;
