import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Calendar,
  User,
  Flag,
  Pencil,
  Trash2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { cn } from 'lib/utils';
import { motion } from 'framer-motion';

const priorityConfig = {
  high: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: AlertTriangle },
  medium: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Flag },
  low: { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: Flag }, // Using sky for a neutral 'low'
};

const statusConfig = {
  not_started: { color: 'bg-slate-100 text-slate-600', label: 'Not Started' },
  in_progress: { color: 'bg-amber-100 text-amber-700', label: 'In Progress' },
  completed: { color: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
  blocked: { color: 'bg-rose-100 text-rose-700', label: 'Blocked' },
};

export default function TaskItem({ task, onUpdate }) {
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = task.status === 'completed';
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isCompleted;
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const handleToggleComplete = () => {
    const newStatus = isCompleted ? 'not_started' : 'completed';
    onUpdate(task.id, { status: newStatus });
  };

  const handleStatusChange = (status) => {
    onUpdate(task.id, { status });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg transition-all',
        'hover:bg-slate-50 border border-transparent hover:border-slate-300 hover:shadow-sm',
        isCompleted && 'opacity-60'
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggleComplete}
        className={cn(
          'mt-1 h-5 w-5 rounded-full border-2',
          isCompleted ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
        )}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p
              className={cn(
                'text-sm font-medium text-slate-900 transition-all',
                isCompleted && 'line-through text-slate-500'
              )}
            >
              {task.title}
            </p>

            {task.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {task.priority && task.priority !== 'medium' && (
                <Badge
                  variant="outline"
                  className={cn('text-xs', priorityConfig[task.priority]?.color)}
                >
                  {task.priority}
                </Badge>
              )}

              {task.due_date && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs flex items-center gap-1',
                    isOverdue && 'bg-rose-50 text-rose-700 border-rose-200',
                    isDueToday && !isOverdue && 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.due_date), 'MMM d')}
                  {isOverdue && <span className="ml-1">overdue</span>}
                </Badge>
              )}

              {task.assigned_to && (
                <Badge variant="outline" className="text-xs flex items-center gap-1 bg-slate-50">
                  <User className="w-3 h-3" />
                  {task.assigned_to.split('@')[0]}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity',
                  isHovered && 'opacity-100'
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleStatusChange('not_started')}>
                <Clock className="w-4 h-4 mr-2" />
                Not Started
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                <Clock className="w-4 h-4 mr-2 text-amber-500" />
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                <Clock className="w-4 h-4 mr-2 text-emerald-500" />
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('blocked')}>
                <AlertTriangle className="w-4 h-4 mr-2 text-rose-500" />
                Blocked
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
