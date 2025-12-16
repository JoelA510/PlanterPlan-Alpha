import React, { useState } from 'react';
import RoleIndicator from '../common/RoleIndicator';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

const TaskItem = ({
  task,
  level = 0,
  onTaskClick,
  selectedTaskId,
  onAddChildTask,
  onInviteMember,
  dragHandleProps = {}, // New prop for dnd-kit
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = task.children && task.children.length > 0;
  const indentWidth = level * 24;
  const isSelected = selectedTaskId === task.id;

  // Hierarchy: Project(0) > Phase(1) > Milestone(2) > Task(3) > Subtask(4)
  // Subtasks (level 4) cannot have children
  const canHaveChildren = level < 4;

  const getBackgroundColor = () => {
    if (level === 0) {
      return 'bg-gray-600';
    } else if (level === 1) {
      return 'bg-blue-600';
    } else if (level === 2) {
      return 'bg-blue-500';
    } else if (level === 3) {
      return 'bg-blue-400';
    } else {
      return 'bg-blue-300';
    }
  };

  const handleCardClick = (e) => {
    if (
      e.target.closest('.expand-button') ||
      e.target.closest('.status-icon') ||
      e.target.closest('.add-child-btn')
    ) {
      return;
    }
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  const handleAddChild = (e) => {
    e.stopPropagation();
    if (onAddChildTask) {
      onAddChildTask(task);
    }
  };

  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `child-context-${task.id}`,
    data: {
      type: 'container',
      parentId: task.id,
      origin: task.origin,
    },
  });

  return (
    <>
      <div
        className={`task-card ${getBackgroundColor()} ${isSelected ? 'selected' : ''}`}
        style={{ marginLeft: `${indentWidth}px` }}
        onClick={handleCardClick}
      >
        <div className="task-card-content">
          <div className="task-card-left">
            <button
              className="drag-handle-btn"
              type="button"
              aria-label="Reorder task"
              ref={dragHandleProps?.ref}
              {...dragHandleProps}
            >
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <circle cx="2" cy="2" r="1" fill="currentColor" />
                <circle cx="6" cy="2" r="1" fill="currentColor" />
                <circle cx="2" cy="7" r="1" fill="currentColor" />
                <circle cx="6" cy="7" r="1" fill="currentColor" />
                <circle cx="2" cy="12" r="1" fill="currentColor" />
                <circle cx="6" cy="12" r="1" fill="currentColor" />
              </svg>
            </button>

            {canHaveChildren ? (
              <button onClick={() => setIsExpanded(!isExpanded)} className="expand-button">
                <svg
                  className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  style={{ opacity: hasChildren ? 1 : 0.3 }}
                >
                  <path d="M4.5 3L7.5 6L4.5 9V3Z" />
                </svg>
              </button>
            ) : (
              <div className="expand-spacer"></div>
            )}

            <div className="task-info">
              <span className="task-title">{task.title}</span>
              {task.duration && <span className="task-duration">{task.duration}</span>}
            </div>
          </div>

          <div className="task-card-right">
            {task.membership_role && <RoleIndicator role={task.membership_role} />}
            <div className={`status-icon ${task.status}`}></div>
            {canHaveChildren && onAddChildTask && (
              <button className="add-child-btn" onClick={handleAddChild} title="Add subtask">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 2.5V9.5M2.5 6H9.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            {level === 0 && onInviteMember && (
              <button
                className="add-child-btn ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onInviteMember(task);
                }}
                title="Invite Member"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {canHaveChildren && isExpanded && (
        <div
          className="task-children"
          style={{ minHeight: '10px' }}
          ref={setDroppableNodeRef}
        >
          <SortableContext
            items={task.children ? task.children.map((c) => c.id) : []}
            strategy={verticalListSortingStrategy}
            id={`sortable-context-${task.id}`}
          >
            {task.children &&
              task.children.map((child) => (
                <SortableTaskItem
                  key={child.id}
                  task={child}
                  level={level + 1}
                  onTaskClick={onTaskClick}
                  selectedTaskId={selectedTaskId}
                  onAddChildTask={onAddChildTask}
                  onInviteMember={onInviteMember}
                />
              ))}
          </SortableContext>
        </div>
      )}
    </>
  );
};

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
      origin: task.origin,
      parentId: task.parent_task_id ?? null, // null for roots
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-task-wrapper">
      <TaskItem
        task={task}
        level={level}
        dragHandleProps={{ ...attributes, ...listeners, ref: setActivatorNodeRef }}
        {...props}
      />
    </div>
  );
}

export default TaskItem;
