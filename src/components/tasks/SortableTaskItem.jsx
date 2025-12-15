import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';

export function SortableTaskItem({ task, level, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
      origin: task.origin,
      parentId: task.parent_task_id || null, // null for roots
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, // Visual feedback for original item while dragging
    position: 'relative',
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-task-wrapper">
      <TaskItem
        task={task}
        level={level}
        dragHandleProps={{ ...attributes, ...listeners, ref: setActivatorNodeRef }} // Pass activator ref
        {...props}
      />
    </div>
  );
}

export default SortableTaskItem;
