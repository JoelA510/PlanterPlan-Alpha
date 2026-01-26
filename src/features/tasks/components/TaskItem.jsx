// src/components/molecules/TaskItem.jsx
import { useCallback, memo } from 'react';
import RoleIndicator from '@shared/ui/RoleIndicator';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@shared/lib/utils';
import ErrorBoundary from '@shared/ui/ErrorBoundary';
import { Lock, Link as LinkIcon, GripVertical } from 'lucide-react';
import TaskStatusSelect from './TaskStatusSelect';
import TaskControlButtons from './TaskControlButtons';

const TaskItem = memo(
  ({
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
    onEdit = null,
    onDelete = null,
    hideExpansion = false,
    disableDrag = false,
  }) => {
    const hasChildren = task.children && task.children.length > 0;
    const indentWidth = level * 20;
    const isSelected = selectedTaskId === task.id;
    const canHaveChildren = level < 4;

    const isExpanded = !!task.isExpanded;
    const showChevron = !hideExpansion && canHaveChildren && (hasChildren || forceShowChevron);

    // Dnd-kit droppable
    const { setNodeRef: setDroppableNodeRef } = useDroppable({
      id: `child-context-${task.id}`,
      data: {
        type: 'container',
        parentId: task.id,
        origin: task.origin,
      },
    });

    const handleCardClick = useCallback(
      (e) => {
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
      },
      [onTaskClick, task]
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

    const isLocked = task.is_locked || false;

    return (
      <>
        <div
          className={cn(
            'relative flex flex-col min-w-0 py-4 px-5 mb-3 rounded-xl border transition-all duration-200 shadow-sm',
            'bg-card text-card-foreground', // Default card styles
            isSelected
              ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-100'
              : 'border-border hover:border-brand-300',
            isLocked && 'opacity-70 bg-slate-50',
            level === 0 && 'border-l-4 border-l-brand-600'
          )}
          style={{ marginLeft: `${indentWidth}px` }}
          onClick={!isLocked ? handleCardClick : undefined}
        >
          <div className="flex items-center justify-between gap-4">
            {/* LEFT SIDE: Drag Handle, Expand, Info */}
            <div className="flex-1 flex items-center min-w-0 overflow-hidden">
              {!disableDrag && (
                <button
                  className={cn(
                    'mr-2 p-1 rounded transition-colors flex-shrink-0',
                    isLocked
                      ? 'cursor-not-allowed opacity-30 text-slate-400'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  )}
                  type="button"
                  aria-label="Reorder task"
                  ref={!isLocked ? dragHandleProps?.ref : undefined}
                  {...(!isLocked ? dragHandleProps : {})}
                  disabled={isLocked}
                >
                  {isLocked ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <GripVertical className="w-4 h-4" />
                  )}
                </button>
              )}

              {showChevron ? (
                <button
                  onClick={handleToggleExpandClick}
                  className="expand-button p-1 mr-2 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors flex-shrink-0"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <svg
                    className={cn(
                      'transition-transform duration-200',
                      isExpanded ? 'rotate-90' : ''
                    )}
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
                <div className="w-6 mr-2 flex-shrink-0"></div>
              )}

              <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                <span
                  className="font-medium text-slate-700 text-sm truncate"
                  title={task.title}
                >
                  {task.title}
                </span>
                {task.duration && (
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 whitespace-nowrap flex-shrink-0">
                    {task.duration}
                  </span>
                )}
                {task.resource_type && (
                  <span className="px-2.5 py-1 text-xs uppercase font-bold tracking-wider rounded bg-brand-50 text-brand-700 border border-brand-100 whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    {task.resource_type}
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: Role, Status, Controls */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {task.membership_role && <RoleIndicator role={task.membership_role} />}

              <TaskStatusSelect
                status={task.status}
                taskId={task.id}
                onStatusChange={onStatusChange}
              />

              <TaskControlButtons
                task={task}
                onEdit={onEdit}
                onAddChild={onAddChildTask}
                onInvite={onInviteMember}
                onDelete={onDelete}
                canHaveChildren={canHaveChildren}
              />
            </div>
          </div>
        </div>

        {canHaveChildren && isExpanded && (
          <div className="pl-0" ref={setDroppableNodeRef}>
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
                  />
                ))}
            </SortableContext>
          </div>
        )}
      </>
    );
  }
);

export const SortableTaskItem = memo(function SortableTaskItem({ task, level, ...props }) {
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
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : 'auto',
    scale: isDragging ? 1.02 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-shadow duration-200',
        isDragging && 'shadow-xl rounded-xl z-50'
      )}
    >
      <ErrorBoundary name={`Task-${task.id}`}>
        <TaskItem
          task={task}
          level={level}
          dragHandleProps={{ ...attributes, ...listeners, ref: setActivatorNodeRef }}
          {...props}
        />
      </ErrorBoundary>
    </div>
  );
});

TaskItem.displayName = '@features/tasks/components/TaskItem';

export default TaskItem;
