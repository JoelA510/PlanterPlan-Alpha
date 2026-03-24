import { useQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Card } from '@/shared/ui/card';
import { Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { TASK_STATUS } from '@/shared/constants';
import { nowUtcIso, endOfDayDate, isBeforeDate, formatDate } from '@/shared/lib/date-engine';
import type { TaskRow } from '@/shared/db/app.types';

export default function DailyTasks() {
    const { user } = useAuth();

    const { data: allTasks = [], isLoading } = useQuery<TaskRow[]>({
        queryKey: ['allTasks', user?.id],
        queryFn: () => planter.entities.Task.listByCreator(user?.id as string),
        enabled: !!user,
    });

    const today = nowUtcIso();
    const endOfToday = endOfDayDate(today) || today;

    const dailyTasks = allTasks.filter(t => {
        if (t.status === TASK_STATUS.COMPLETED) return false;
        if (!t.due_date) return false;
        return !isBeforeDate(endOfToday, t.due_date);
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 data-testid="loading-spinner" className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                Daily Tasks
                            </h1>
                            <p className="text-slate-600 mt-1">
                                {dailyTasks.length} {dailyTasks.length === 1 ? 'task' : 'tasks'} due today or overdue
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {dailyTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">All caught up!</h3>
                        <p className="text-slate-500 max-w-sm text-center">
                            You have no tasks due today or overdue. Great job!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dailyTasks.map((task, index) => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="p-4 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-medium text-slate-900 truncate">{task.title}</h4>
                                            {task.description && (
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                                task.status === TASK_STATUS.IN_PROGRESS
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : task.status === TASK_STATUS.BLOCKED
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {task.status === TASK_STATUS.IN_PROGRESS ? 'In Progress' :
                                                 task.status === TASK_STATUS.BLOCKED ? 'Blocked' : 'To Do'}
                                            </span>
                                            {task.due_date && (
                                                <span className={`text-sm font-medium ${
                                                    isBeforeDate(task.due_date, today)
                                                        ? 'text-red-600'
                                                        : 'text-orange-600'
                                                }`}>
                                                    {formatDate(task.due_date, 'MMM d')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
