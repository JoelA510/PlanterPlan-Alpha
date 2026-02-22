import PropTypes from 'prop-types';
import { cn } from '@/shared/lib/utils';
import { Card } from '@/shared/ui/card';
import { FolderKanban, CheckCircle2, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TASK_STATUS } from '@/app/constants/index';
import { useMemo } from 'react';

export default function StatsOverview({ projects, tasks, teamMembers }) {
  const { totalProjects, completedTasks, totalTasks, pendingTasks } = useMemo(() => {
    return {
      totalProjects: projects.length,
      totalTasks: tasks.length,
      completedTasks: tasks.reduce((acc, t) => (t.status === TASK_STATUS.COMPLETED ? acc + 1 : acc), 0),
      pendingTasks: tasks.reduce(
        (acc, t) => (t.status === TASK_STATUS.TODO || t.status === TASK_STATUS.IN_PROGRESS ? acc + 1 : acc),
        0
      ),
    };
  }, [projects.length, tasks]);

  const stats = [
    {
      label: 'Total Projects',
      value: totalProjects,
      icon: FolderKanban,
      // Design System: Primary/Brand
      bgColor: 'bg-brand-50 dark:bg-brand-900/20',
      textColor: 'text-brand-600 dark:text-brand-400',
      borderColor: 'group-hover:border-brand-300 dark:group-hover:border-brand-700',
      href: '/reports', // Mapping to Reports as Project List
    },
    {
      label: 'Completed Tasks',
      value: completedTasks,
      icon: CheckCircle2,
      // Design System: Success
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'group-hover:border-emerald-300 dark:group-hover:border-emerald-700',
      suffix: `/ ${totalTasks}`,
      href: '/tasks', // TODO: Add filter params when supported
    },
    {
      label: 'Pending Tasks',
      value: pendingTasks,
      icon: Clock,
      // Design System: Warning/Pending
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'group-hover:border-amber-300 dark:group-hover:border-amber-700',
      href: '/tasks',
    },
    {
      label: 'Team Members',
      value: teamMembers.length,
      icon: Users,
      // Design System: Secondary/Accent
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      textColor: 'text-slate-700 dark:text-slate-200',
      borderColor: 'group-hover:border-slate-300 dark:group-hover:border-slate-600',
      href: '/team',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="h-full"
        >
          <Link to={stat.href} className="block h-full group">
            <Card
              className={cn(
                'p-5 border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md h-full relative overflow-hidden',
                stat.borderColor
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
                    stat.bgColor
                  )}
                >
                  <stat.icon className={cn('w-6 h-6', stat.textColor)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-card-foreground mt-0.5">
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {stat.suffix}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
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
