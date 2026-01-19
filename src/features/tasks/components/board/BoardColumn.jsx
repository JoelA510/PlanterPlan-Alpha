import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableBoardTaskCard from './BoardTaskCard';
import { cn } from '@shared/lib/utils';

const BoardColumn = ({ id, title, tasks, onTaskClick, className, parentId }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `column-${id}`,
        data: {
            type: 'container',
            status: id,
            isColumn: true,
            parentId: parentId,
        },
    });

    return (
        <div className={cn("flex flex-col min-w-[280px] w-[280px] rounded-xl bg-slate-50/50 border border-slate-200 h-full max-h-full", className)}>
            {/* Header */}
            <div className={cn(
                "p-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-slate-50/95 backdrop-blur-sm rounded-t-xl z-10",
                isOver && "bg-brand-50/50"
            )}>
                <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">
                    {title}
                </h3>
                <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full font-medium">
                    {tasks.length}
                </span>
            </div>

            {/* Task List */}
            <div ref={setNodeRef} className="flex-1 p-2 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <SortableContext
                    items={tasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-col gap-2 min-h-[50px]">
                        {tasks.map((task) => (
                            <SortableBoardTaskCard
                                key={task.id}
                                task={task}
                                onClick={onTaskClick}
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
};

import PropTypes from 'prop-types';

BoardColumn.propTypes = {
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    tasks: PropTypes.array.isRequired,
    onTaskClick: PropTypes.func.isRequired,
    className: PropTypes.string,
    parentId: PropTypes.string
};

export default BoardColumn;
