import React, { useState, useCallback } from 'react';
import RoleIndicator from '../atoms/RoleIndicator';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import '../../styles/components/task-card.css'; // Ensure CSS is imported

// Status Styling Map (Pill Design)
const getStatusStyle = (status) => {
  switch (status) {
    case 'complete':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'blocked':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const TaskItem = ({
  task,
  level = 0,
  onTaskClick,
  selectedTaskId,
  onAddChildTask,
  onInviteMember,
  onStatusChange,
  dragHandleProps = {},
  forceShowChevron = false,
  onToggleExpand,
  onEdit,
  onDelete,
  isExpanded, // New prop
  expandedTaskIds, // New prop
}) => {
  // const [isExpanded, setIsExpanded] = useState(false);  <-- REMOVED

  const hasChildren = task.children && task.children.length > 0;
  // Reduced indentation multiplier for tighter tree (24px -> 20px)
  const indentWidth = level * 20;
  const isSelected = selectedTaskId === task.id;
  const canHaveChildren = level < 4;
  // Use prop for expanded state (or default to false)
  const showChevron = canHaveChildren && (hasChildren || forceShowChevron);

  const handleCardClick = useCallback((e) => {
    // Prevent click when interacting with controls
    if (
      e.target.closest('.expand-button') ||
      e.target.closest('select') ||
      e.target.closest('button')
    ) {
      return;
    }
    if (onTaskClick) {
      onTaskClick(task);
    }
  }, [onTaskClick, task]);

  const handleAddChild = useCallback((e) => {
    e.stopPropagation();
    if (onAddChildTask) {
      onAddChildTask(task);
    }
  }, [onAddChildTask, task]);

  const handleEdit = useCallback(
    (e) => {
      e.stopPropagation();
      if (onEdit) onEdit(task);
    },
    [onEdit, task]
  );

  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation();
      if (onDelete) onDelete(task.id);
    },
    [onDelete, task]
  );

  const handleInvite = useCallback(
    (e) => {
      e.stopPropagation();
      if (onInviteMember) onInviteMember(task);
    },
    [onInviteMember, task]
  );

  const handleToggleExpandClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (onToggleExpand) {
        onToggleExpand(task, !isExpanded);
      }
    },
    [onToggleExpand, task, isExpanded]
  );

  const handleStatusChangeClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (onStatusChange) onStatusChange(task.id, e.target.value);
    },
    [onStatusChange, task]
  );

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
        className={`task-card level-${level} ${isSelected ? 'selected' : ''}`}
        style={{ marginLeft: `${indentWidth}px` }}
        onClick={handleCardClick}
      >
        <div className="task-card-content">
          <div className="task-card-left">
            {/* Drag Handle */}
            <button
              className="drag-handle-btn"
              type="button"
              aria-label="Reorder task"
              ref={dragHandleProps?.ref}
              {...dragHandleProps}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 4h2v2H4V4zm6 0h2v2h-2V4zM4 10h2v2H4v-2zm6 0h2v2h-2v-2z" opacity="0.6" />
              </svg>
            </button>

            {/* Expand / Collapse Chevron */}
            {showChevron ? (
              <button
                onClick={handleToggleExpandClick}
                className="expand-button"
                style={{ visibility: 'visible' }}
              >
                <svg
                  className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ) : (
              <div className="expand-spacer"></div>
            )}

            <div className="task-info flex items-center">
              <span className="task-title">{task.title}</span>
              {task.duration && <span className="task-duration">{task.duration}</span>}
              {task.resource_type && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-slate-100 text-slate-500 border border-slate-200">
                  {task.resource_type}
                </span>
              )}
            </div>
          </div>

          <div className="task-card-right">
            {task.membership_role && <RoleIndicator role={task.membership_role} />}

            {/* Modern Status Pill Dropdown */}
            <div className="relative group">
              <select
                className={`appearance-none cursor-pointer pl-3 pr-8 py-1 text-xs font-semibold rounded-full border transition-all ${getStatusStyle(task.status)} focus:ring-2 focus:ring-offset-1 focus:ring-[var(--brand-primary)] focus:outline-none`}
                value={task.status}
                onClick={(e) => e.stopPropagation()}
                onChange={handleStatusChangeClick}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="complete">Complete</option>
              </select>
              {/* Arrow removed per user request */}
            </div>

            {/* Edit Button */}
            {onEdit && (
              <button
                className="action-btn"
                onClick={handleEdit}
                title="Edit Task"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            )}

            {/* Add Subtask Button */}
            {canHaveChildren && onAddChildTask && (
              <button className="action-btn" onClick={handleAddChild} title="Add Subtask">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}

            {/* Invite Member Button */}
            {onInviteMember && (
              <button
                className="action-btn"
                onClick={handleInvite}
                title="Invite Member"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                className="action-btn delete"
                onClick={handleDelete}
                title="Delete Task"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {canHaveChildren && isExpanded && (
        <div className="task-children" ref={setDroppableNodeRef}>
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
                  onStatusChange={onStatusChange}
                  onToggleExpand={onToggleExpand}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  expandedTaskIds={expandedTaskIds}
                  isExpanded={expandedTaskIds?.has(child.id)}
                />
              ))}
          </SortableContext>
        </div>
      )}
    </>
  );
};

// ... SortableTaskItem remains the same ...
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
      parentId: task.parent_task_id ?? null,
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
