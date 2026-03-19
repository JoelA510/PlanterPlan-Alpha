import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { ChevronRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/shared/lib/utils';
import { TASK_STATUS } from '@/shared/constants';
import { SortableTaskItem } from '@/features/tasks/components/TaskItem';
import InlineTaskInput from '@/features/tasks/components/InlineTaskInput';

import { TaskRow, Task } from '@/shared/db/app.types';
import type { TaskUpdate } from '@/shared/db/app.types';

interface TaskWithState extends Task {
    isExpanded?: boolean;
    isAddingInline?: boolean;
    children?: TaskWithState[];
}

export interface MilestoneSectionProps {
    milestone: TaskRow;
    tasks?: TaskWithState[];
    onTaskUpdate?: (id: string, data: Partial<TaskUpdate>) => void;
    onAddChildTask?: (parent: TaskRow) => void;
    onTaskClick: (task: TaskRow) => void;
    onToggleExpand?: (task: TaskRow, expanded: boolean) => void;
    onInlineCommit?: (parentId: string, title: string) => Promise<void>;
    onInlineCancel?: () => void;
    canEdit?: boolean;
    isAddingInline?: boolean;
}

export default function MilestoneSection({
    milestone,
    tasks = [],
    onTaskUpdate,
    onAddChildTask,
    onTaskClick,
    onToggleExpand,
    onInlineCommit,
    onInlineCancel,
    canEdit = true,
    isAddingInline = false,
}: MilestoneSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const { setNodeRef, isOver } = useDroppable({
        id: `milestone-context-${milestone.id}`,
        data: {
            type: 'container',
            parentId: milestone.id,
            origin: 'milestone', // or task? but it acts as a parent container
        },
    });

    const milestoneTasks = tasks.filter((t) => t.parent_task_id === milestone.id);
    const completedTasks = milestoneTasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
    const totalTasks = milestoneTasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "border rounded-xl overflow-hidden transition-all duration-200",
                isOver ? "border-brand-400 bg-brand-50/50 ring-2 ring-brand-200 " : "border-slate-200 bg-white shadow-sm hover:shadow-md"
            )}
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    </motion.div>

                    <div className="text-left">
                        <h4 className="font-semibold text-slate-900">{milestone.title}</h4>
                        {milestone.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{milestone.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="w-32">
                            <Progress value={progress} className="h-2 bg-slate-100" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 w-12 text-right">{progress}%</span>
                    </div>
                    {milestone.is_locked && (
                        <Badge
                            variant="outline"
                            className="text-xs px-1.5 h-5 bg-slate-50 text-slate-500 border-slate-200"
                        >
                            Locked
                        </Badge>
                    )}
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                        {completedTasks}/{totalTasks}
                    </Badge>
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="px-5 pb-4 border-t border-slate-100">
                            {milestoneTasks.length === 0 && !isAddingInline ? (
                                <div className="py-8 text-center">
                                    <p className="text-slate-500 mb-4">No tasks yet</p>
                                    {canEdit && onAddChildTask && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onAddChildTask(milestone)}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Task
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2 pt-4">
                                    <SortableContext
                                        items={milestoneTasks.map(t => t.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                    <AnimatePresence mode="popLayout">
                                        {milestoneTasks
                                            .sort((a, b) => (a.position || 0) - (b.position || 0))
                                            .map((task) => (
                                                <motion.div
                                                    key={task.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                                >
                                                    <SortableTaskItem
                                                        task={task}
                                                        level={0}
                                                        onTaskClick={onTaskClick}
                                                        onStatusChange={(id, status) => onTaskUpdate?.(id, { status } as Partial<TaskRow>)}
                                                        onAddChildTask={onAddChildTask}
                                                        onToggleExpand={onToggleExpand}
                                                        isAddingInline={task.isAddingInline}
                                                        onInlineCommit={onInlineCommit}
                                                        onInlineCancel={onInlineCancel}
                                                    />
                                                </motion.div>
                                            ))}

                                        {isAddingInline && onInlineCommit && onInlineCancel && (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="mt-2"
                                            >
                                                <InlineTaskInput
                                                    onCommit={(title) => onInlineCommit(milestone.id, title)}
                                                    onCancel={onInlineCancel}
                                                    placeholder="Add a new task..."
                                                />
                                            </motion.div>
                                        )}

                                        {!isAddingInline && canEdit && onAddChildTask && (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full text-slate-500 hover:text-slate-700 mt-2"
                                                    onClick={() => onAddChildTask(milestone)}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add Task
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    </SortableContext>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
