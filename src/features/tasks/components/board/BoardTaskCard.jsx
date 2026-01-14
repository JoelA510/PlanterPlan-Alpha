import { memo } from 'react';
import PropTypes from 'prop-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import RoleIndicator from '@shared/ui/RoleIndicator';
import { Link as LinkIcon } from 'lucide-react';

const BoardTaskCard = memo(({ task, onClick, dragHandleProps, style, isDragging }) => {
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
                    <h4 className="text-sm font-medium text-slate-800 line-clamp-3 leading-snug">
                        {task.title}
                    </h4>
                </div>
                {task.membership_role && <RoleIndicator role={task.membership_role} size="sm" />}
            </div>

            {task.children && task.children.length > 0 && (
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                    <span className="font-semibold">{task.children.length}</span> subtasks
                </div>
            )}
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
}

export default SortableBoardTaskCard;
