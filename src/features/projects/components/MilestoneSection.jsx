import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { ChevronRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/shared/lib/utils';
import { TASK_STATUS } from '@/app/constants/index';
import TaskItem from '@/features/tasks/components/TaskItem';

export default function MilestoneSection({
  milestone,
  tasks = [],
  onTaskUpdate,
  onAddTask,
  onAddChildTask,
  onTaskClick,
  onInlineCommit,
  onInlineCancel,
  canEdit = true, // Default to true if not passed for backward compat
}) {
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
        isOver ? "border-brand-400 bg-brand-50/50 dark:bg-brand-900/20 ring-2 ring-brand-200 dark:ring-brand-800" : "border-slate-200 bg-white shadow-sm hover:shadow-md"
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
            <h4 className="font-semibold text-slate-900">{milestone.title || milestone.name}</h4>
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
              {milestoneTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-slate-500 mb-4">No tasks yet</p>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAddTask(milestone)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-4">
                  {milestoneTasks
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onTaskClick={onTaskClick}
                        onStatusChange={(id, status) => onTaskUpdate(id, { status })}
                        onAddChildTask={onAddChildTask}
                        isAddingInline={task.isAddingInline}
                        onInlineCommit={onInlineCommit}
                        onInlineCancel={onInlineCancel}
                      />
                    ))}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-slate-500 hover:text-slate-700 mt-2"
                      onClick={() => onAddTask(milestone)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
