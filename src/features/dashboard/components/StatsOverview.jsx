import PropTypes from 'prop-types';
import { cn } from '@shared/lib/utils';
import { Card } from '@shared/ui/card';
import { FolderKanban, CheckCircle2, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { TASK_STATUS } from '@app/constants/index';

export default function StatsOverview({ projects, tasks, teamMembers }) {
  const totalProjects = projects.length;
  const completedTasks = tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(
    (t) => t.status === TASK_STATUS.TODO || t.status === TASK_STATUS.IN_PROGRESS
  ).length;

  const stats = [
    {
      label: 'Total Projects',
      value: totalProjects,
      icon: FolderKanban,
      // Design System: Primary/Brand
      bgColor: 'bg-brand-50 dark:bg-brand-900/20',
      textColor: 'text-brand-600 dark:text-brand-400',
      borderColor: 'hover:border-brand-200 dark:hover:border-brand-800',
    },
    {
      label: 'Completed Tasks',
      value: completedTasks,
      icon: CheckCircle2,
      // Design System: Success
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'hover:border-emerald-200 dark:hover:border-emerald-800',
      suffix: `/ ${totalTasks}`,
    },
    {
      label: 'Pending Tasks',
      value: pendingTasks,
      icon: Clock,
      // Design System: Warning/Pending
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'hover:border-amber-200 dark:hover:border-amber-800',
    },
    {
      label: 'Team Members',
      value: teamMembers.length,
      icon: Users,
      // Design System: Secondary/Accent
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      textColor: 'text-slate-600 dark:text-slate-400',
      borderColor: 'hover:border-slate-300 dark:hover:border-slate-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className={cn(
              'p-5 border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md',
              stat.borderColor
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  stat.bgColor
                )}
              >
                <stat.icon className={cn('w-6 h-6', stat.textColor)} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-1">
                      {stat.suffix}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

StatsOverview.propTypes = {
  projects: PropTypes.array.isRequired,
  tasks: PropTypes.array.isRequired,
  teamMembers: PropTypes.array.isRequired
};
