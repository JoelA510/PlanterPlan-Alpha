import { memo } from 'react';
import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Link as LinkIcon } from 'lucide-react';
import RoleIndicator from '@/shared/ui/RoleIndicator';
import { formatDate, isPastDate, isTodayDate, isDateValid } from '@/shared/lib/date-engine';


/**
 * Format a due date for display
 */
const formatDueDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
        if (!isDateValid(dateString)) return null;
        return formatDate(dateString, 'MMM d');
    } catch {
        return null;
    }
};

/**
 * Get date color based on urgency
 */
const getDateColor = (dateString?: string | null) => {
    if (!dateString) return 'text-slate-400';
    try {
        if (!isDateValid(dateString)) return 'text-slate-400';
        if (isPastDate(dateString)) return 'text-rose-600';
        if (isTodayDate(dateString)) return 'text-amber-600';
        return 'text-slate-500';
    } catch {
        return 'text-slate-400';
    }
};

import type { TaskItemData } from '@/features/tasks/components/TaskItem';

export interface BoardTaskCardData extends TaskItemData {
    breadcrumbs?: string;
}

interface BoardTaskCardProps {
    task: BoardTaskCardData;
    onClick: (task: BoardTaskCardData) => void;
    dragHandleProps?: Record<string, unknown>;
    style?: CSSProperties;
    isDragging?: boolean;
}

const BoardTaskCard = memo(({ task, onClick, dragHandleProps, style, isDragging }: BoardTaskCardProps) => {
    const formattedDate = formatDueDate(task.due_date);
    const dateColor = getDateColor(task.due_date);

    return (
        <div
            className={`bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group mb-2 ${isDragging ? 'opacity-50 ring-2 ring-brand-500' : ''}`}
            style={style}
            onClick={() => onClick(task)}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <button
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100"
                            {...dragHandleProps}
                        >
                            <GripVertical className="w-4 h-4" />
                        </button>
                        {task.resource_type && (
                            <span className="p-1 rounded bg-brand-50 text-brand-700">
                                <LinkIcon className="w-3 h-3" />
                            </span>
                        )}
                    </div>

                    {/* Breadcrumbs - Hierarchy Context */}
                    {task.breadcrumbs && (
                        <div className="mb-0.5 text-xs text-slate-400 font-medium truncate" title={task.breadcrumbs}>
                            {task.breadcrumbs}
                        </div>
                    )}

                    <h4 className="text-sm font-medium text-slate-800 line-clamp-3 leading-snug">
                        {task.title}
                    </h4>
                </div>

                {/* Flex-shrink container forces badge to remain uniform without squishing */}
                {task.membership_role && (
                    <div className="flex-shrink-0 pt-0.5">
                        <RoleIndicator role={task.membership_role} />
                    </div>
                )}
            </div>

            {/* Footer: Subtasks + Due Date */}
            <div className="mt-2 flex items-center justify-between text-xs">
                {task.children && task.children.length > 0 ? (
                    <div className="text-slate-400 flex items-center gap-1">
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

export const SortableBoardTaskCard = memo(({ task, onClick }: { task: BoardTaskCardData, onClick: (task: BoardTaskCardData) => void }) => {
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

export default SortableBoardTaskCard;
