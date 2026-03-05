
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskItem, { SortableTaskItem } from '@/features/tasks/components/TaskItem';
import type { TaskRow } from '@/shared/db/app.types';

interface TaskItemProps {
 onTaskClick: (task: TaskRow) => void;
 selectedTaskId?: string | null;
 onAddChildTask?: (task: TaskRow) => void;
 onEdit?: (task: TaskRow) => void;
 onDelete?: (id: string) => void;
 hideExpansion?: boolean;
 onToggleExpand?: (id: string | any) => void;
 onStatusChange?: (id: string, status: string) => void;
 [key: string]: unknown;
}

interface ProjectListViewProps {
 project: TaskRow & { origin?: string };
 childrenTasks: TaskRow[];
 taskItemProps: TaskItemProps;
 disableDrag?: boolean;
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

 // Standard rendering when DnD is disabled
 if (disableDrag) {
 return (
 <div ref={listDropRef} className="task-cards-container space-y-2">
 {childrenTasks.map((task) => (
 <TaskItem key={task.id} task={task as TaskRow} level={0} {...taskItemProps} />
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
 <SortableTaskItem key={task.id} task={task as TaskRow} level={0} {...taskItemProps} />
 ))}
 </div>
 </SortableContext>
 );
};

export default ProjectListView;
