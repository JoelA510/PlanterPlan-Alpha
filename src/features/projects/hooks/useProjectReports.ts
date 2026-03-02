import { useMemo } from 'react';
import { TASK_STATUS } from '@/app/constants/index';
import { CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react';
import type { TaskRow } from '@/shared/db/app.types';

export function useProjectReports(tasks: TaskRow[], phases: TaskRow[]) {
    return useMemo(() => {
        // Basic task counts
        const tasksByStatus = {
            completed: tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length,
            in_progress: tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length,
            not_started: tasks.filter((t) => t.status === TASK_STATUS.TODO).length,
            blocked: tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length,
        };

        const statsConfig = [
            {
                label: 'Completed', value: tasksByStatus.completed, icon: CheckCircle2,
                borderClass: 'border-green-200', bgClass: 'bg-green-100', hoverBgClass: 'bg-green-500', textClass: 'text-green-600'
            },
            {
                label: 'In Progress', value: tasksByStatus.in_progress, icon: Clock,
                borderClass: 'border-orange-200', bgClass: 'bg-orange-100', hoverBgClass: 'bg-orange-500', textClass: 'text-orange-600'
            },
            {
                label: 'Not Started', value: tasksByStatus.not_started, icon: Circle,
                borderClass: 'border-indigo-200', bgClass: 'bg-indigo-100', hoverBgClass: 'bg-indigo-500', textClass: 'text-indigo-600'
            },
            {
                label: 'Blocked', value: tasksByStatus.blocked, icon: AlertTriangle,
                borderClass: 'border-red-200', bgClass: 'bg-red-100', hoverBgClass: 'bg-red-500', textClass: 'text-red-600'
            },
        ];

        const totalTasks = tasks.length;
        const completedTasks = tasksByStatus.completed;
        const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
        const phaseData = sortedPhases.map((phase) => {
            const phaseTasks = tasks.filter((t: TaskRow) => (t as TaskRow & { phase_id?: string }).phase_id === phase.id);
            const completed = phaseTasks.filter((t: TaskRow) => t.status === TASK_STATUS.COMPLETED).length;
            const total = phaseTasks.length;
            return {
                name: `Phase ${phase.order}`,
                fullName: phase.title,
                completed,
                remaining: total - completed,
                total,
                progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            };
        });

        // Mock Data for charts
        const reports = {
            projectProgress: [
                { name: 'Alpha', progress: 75 },
                { name: 'Beta', progress: 45 },
                { name: 'Gamma', progress: 90 },
            ],
            taskDistribution: [
                { name: 'To Do', value: tasksByStatus.not_started || 10 },
                { name: 'In Progress', value: tasksByStatus.in_progress || 20 },
                { name: 'Done', value: tasksByStatus.completed || 30 },
            ],
            upcomingDeadlines: [
                { id: 1, title: 'Launch', project: 'Alpha', date: '2023-10-01', priority: 'High' },
                { id: 2, title: 'Test', project: 'Beta', date: '2023-10-05', priority: 'Medium' },
            ],
        };

        return {
            statsConfig,
            overallProgress,
            completedTasks,
            totalTasks,
            phaseData,
            reports,
        };
    }, [tasks, phases]);
}
