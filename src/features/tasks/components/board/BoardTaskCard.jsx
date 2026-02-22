import { memo } from 'react';
import PropTypes from 'prop-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Link as LinkIcon } from 'lucide-react';
import RoleIndicator from '@/shared/ui/RoleIndicator';
import { format, isPast, isToday } from 'date-fns';

/**
 * Format a due date for display
 */
const formatDueDate = (dateString) => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        return format(date, 'MMM d');
    } catch {
        return null;
    }
};

/**
 * Get date color based on urgency
 */
const getDateColor = (dateString) => {
    if (!dateString) return 'text-slate-400 dark:text-slate-500';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'text-slate-400 dark:text-slate-500';
        if (isPast(date) && !isToday(date)) return 'text-rose-600 dark:text-rose-400';
        if (isToday(date)) return 'text-amber-600 dark:text-amber-400';
        return 'text-slate-500 dark:text-slate-400';
    } catch {
        return 'text-slate-400 dark:text-slate-500';
    }
};

const BoardTaskCard = memo(({ task, onClick, dragHandleProps, style, isDragging }) => {
    const formattedDate = formatDueDate(task.due_date);
    const dateColor = getDateColor(task.due_date);

    return (
        <div
            className={`bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow cursor-pointer group mb-2 ${isDragging ? 'opacity-50 ring-2 ring-brand-500' : ''}`}
            style={style}
            onClick={() => onClick(task)}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <button
                            className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            {...dragHandleProps}
                        >
                            <GripVertical className="w-4 h-4" />
                        </button>
                        {task.resource_type && (
                            <span className="p-1 rounded bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                                <LinkIcon className="w-3 h-3" />
                            </span>
                        )}
                    </div>

                    {/* Breadcrumbs - Hierarchy Context */}
                    {task.breadcrumbs && (
                        <div className="mb-0.5 text-xs text-slate-400 dark:text-slate-500 font-medium truncate" title={task.breadcrumbs}>
                            {task.breadcrumbs}
                        </div>
                    )}

                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-3 leading-snug">
                        {task.title}
                    </h4>
                </div>
                {task.membership_role && <RoleIndicator role={task.membership_role} size="sm" />}
            </div>

            {/* Footer: Subtasks + Due Date */}
            <div className="mt-2 flex items-center justify-between text-xs">
                {task.children && task.children.length > 0 ? (
                    <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <span className="font-semibold">{task.children.length}</span> subtasks
                    </div>
                ) : (
                    <div />
                )}
                {formattedDate && (
                    <div className={`flex items-center gap-1 ${dateColor}`}>
                        <Calendar className="w-3 h-3" />
                        <span>{formattedDate}</span>
                    </div>
                )}
            </div>
        </div>
    );
});

BoardTaskCard.displayName = 'BoardTaskCard';

BoardTaskCard.propTypes = {
    task: PropTypes.object.isRequired,
    onClick: PropTypes.func,
    dragHandleProps: PropTypes.object,
    style: PropTypes.object,
    isDragging: PropTypes.bool
};

export const SortableBoardTaskCard = memo(({ task, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            origin: task.origin,
            parentId: task.parent_task_id ?? null,
            status: task.status // Important for board logic
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="touch-none">
            <BoardTaskCard
                task={task}
                onClick={onClick}
                dragHandleProps={{ ...attributes, ...listeners }}
                isDragging={isDragging}
            />
        </div>
    );
});

SortableBoardTaskCard.displayName = 'SortableBoardTaskCard';
SortableBoardTaskCard.propTypes = {
    task: PropTypes.object.isRequired,
    onClick: PropTypes.func
};

export default SortableBoardTaskCard;
