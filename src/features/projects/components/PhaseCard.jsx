import { sanitizeHTML } from '@shared/lib/sanitize';
import { Card } from '@shared/ui/card';
import { Progress } from '@shared/ui/progress';

import { ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@shared/lib/utils';
import { TASK_STATUS } from '@app/constants/index';

const phaseColors = {
  1: {
    bg: 'bg-brand-500',
    light: 'bg-brand-50 dark:bg-brand-950/30',
    text: 'text-brand-600 dark:text-brand-400',
    border: 'border-brand-200 dark:border-brand-800',
  },
  2: {
    bg: 'bg-purple-500',
    light: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
  3: {
    bg: 'bg-indigo-500',
    light: 'bg-indigo-50 dark:bg-indigo-950/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  4: {
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  5: {
    bg: 'bg-amber-500',
    light: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  6: {
    bg: 'bg-rose-500',
    light: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800'
  },
};

export default function PhaseCard({ phase, tasks = [], milestones = [], isActive, onClick }) {
  const order = phase.position || phase.order;
  const colors = phaseColors[order] || phaseColors[1];
  const isLocked = phase.is_locked;

  // Filter tasks that belong to this phase (via milestones)
  const phaseTasks = tasks.filter((t) =>
    milestones.some((m) => m.id === t.parent_task_id && m.parent_task_id === phase.id)
  );

  const completedTasks = phaseTasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
  const totalTasks = phaseTasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isComplete = progress === 100 && totalTasks > 0;

  return (
    <motion.div whileHover={{ scale: isLocked ? 1 : 1.02 }} whileTap={{ scale: isLocked ? 1 : 0.98 }} className="h-full">
      <Card
        onClick={isLocked ? undefined : onClick}
        className={cn(
          'p-5 transition-all duration-300 border-2 bg-card text-card-foreground h-full flex flex-col',
          isLocked
            ? 'opacity-75 cursor-not-allowed border-muted bg-muted/30 text-muted-foreground'
            : cn(
              'cursor-pointer',
              isActive
                ? `${colors.border} ${colors.light} shadow-lg dark:bg-slate-800/50`
                : 'border-border hover:border-brand-300 hover:shadow-lg'
            )
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm',
                isLocked ? 'bg-muted dark:bg-slate-700' : colors.bg
              )}
            >
              {isLocked ? (
                <Lock className="w-5 h-5" />
              ) : isComplete ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                order
              )}
            </div>
            <div>
              <h3 className={cn('font-semibold', isLocked ? 'text-muted-foreground' : 'text-card-foreground')}>
                {phase.title || phase.name}
              </h3>
              <p className="text-sm text-muted-foreground">{milestones.length} milestones</p>
            </div>
          </div>
          <ChevronRight
            className={cn(
              'w-5 h-5 transition-colors',
              isActive && !isLocked ? colors.text : 'text-muted-foreground/50'
            )}
          />
        </div>

        <div className="flex-grow">
          {phase.description && (
            <p
              className="text-sm text-muted-foreground mb-4 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(phase.description) }}
            />
          )}
        </div>

        <div className="space-y-2">
          {isLocked ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded justify-center">
              <Lock className="w-3 h-3" />
              <span>Complete Phase {order - 1} to unlock</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className={cn('font-medium', colors.text)}>{progress}%</span>
              </div>
              <Progress value={progress} className={cn('h-2', colors.light)} />
              <p className="text-xs text-muted-foreground">
                {completedTasks} of {totalTasks} tasks
              </p>
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
