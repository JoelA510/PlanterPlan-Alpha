import PropTypes from 'prop-types';
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
      bgColor: 'bg-brand-50',
      textColor: 'text-brand-600',
      borderColor: 'hover:border-brand-200',
    },
    {
      label: 'Completed Tasks',
      value: completedTasks,
      icon: CheckCircle2,
      // Design System: Success
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'hover:border-emerald-200',
      suffix: `/ ${totalTasks}`,
    },
    {
      label: 'Pending Tasks',
      value: pendingTasks,
      icon: Clock,
      // Design System: Warning/Pending
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'hover:border-amber-200',
    },
    {
      label: 'Team Members',
      value: teamMembers.length,
      icon: Users,
      // Design System: Secondary/Accent
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-600',
      borderColor: 'hover:border-slate-300',
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
            className={`p-5 border border-slate-200 bg-white shadow-sm transition-all duration-300 ${stat.borderColor} hover:shadow-md`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}
              >
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-sm font-normal text-slate-400 ml-1">{stat.suffix}</span>
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
