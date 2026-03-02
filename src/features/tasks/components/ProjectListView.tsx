import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Virtuoso } from 'react-virtuoso';
import TaskItem, { SortableTaskItem } from '@/features/tasks/components/TaskItem';
import type { TaskRow } from '@/shared/db/app.types';

/**
 * Threshold for enabling virtualization.
 * Below this, DnD works normally. Above this, we virtualize for performance.
 */
const VIRTUALIZATION_THRESHOLD = 50;

interface TaskItemProps {
    onTaskClick: (task: TaskRow) => void;
    selectedTaskId?: string | null;
    onAddChildTask?: (task: TaskRow) => void;
    onEdit?: (task: TaskRow) => void;
    onDelete?: (id: string) => void;
    hideExpansion?: boolean;
    onToggleExpand?: (id: string) => void;
    onStatusChange?: (id: string, status: string) => void;
    [key: string]: unknown;
}

interface ProjectListViewProps {
    project: TaskRow & { origin?: string };
    childrenTasks: TaskRow[];
    taskItemProps: TaskItemProps;
    disableDrag?: boolean;
}

interface VirtuosoItemProps {
    children?: ReactNode;
}

const ProjectListView = ({
    project,
    childrenTasks,
    taskItemProps,
    disableDrag = false,
}: ProjectListViewProps) => {
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

    // Virtuoso item renderer
    const renderItem = useCallback((index: number) => {
        const task = childrenTasks[index];
        if (!task) return null;

        if (disableDrag) {
            return <TaskItem key={task.id} task={task} level={0} {...taskItemProps} />;
        }
        return <SortableTaskItem key={task.id} task={task} level={0} {...taskItemProps} />;
    }, [childrenTasks, disableDrag, taskItemProps]);

    const shouldVirtualize = childrenTasks.length > VIRTUALIZATION_THRESHOLD;

    // For very large lists, use virtualization (but note: DnD may not work well)
    if (shouldVirtualize && disableDrag) {
        return (
            <div ref={listDropRef} className="task-cards-container h-full">
                <Virtuoso
                    style={{ height: '100%' }}
                    totalCount={childrenTasks.length}
                    itemContent={renderItem}
                    className="space-y-2"
                    components={{
                        Item: ({ children, ...props }: VirtuosoItemProps) => (
                            <div {...props} className="mb-2">
                                {children}
                            </div>
                        ),
                    }}
                />
            </div>
        );
    }

    // Standard rendering for smaller lists or when DnD is enabled
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

export default ProjectListView;
