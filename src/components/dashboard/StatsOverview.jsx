import React from 'react';
import { Card } from 'components/ui/card';
import { FolderKanban, CheckCircle2, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatsOverview({ projects, tasks, teamMembers }) {
  const totalProjects = projects.length;

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(
    (t) => t.status === 'not_started' || t.status === 'in_progress'
  ).length;

  const stats = [
    {
      label: 'Total Projects',
      value: totalProjects,
      icon: FolderKanban,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Completed Tasks',
      value: completedTasks,
      icon: CheckCircle2,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      suffix: `/ ${totalTasks}`,
    },
    {
      label: 'Pending Tasks',
      value: pendingTasks,
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      label: 'Team Members',
      value: teamMembers.length,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
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
          <Card className="p-5 border border-slate-200 bg-white hover:shadow-lg hover:border-orange-200 transition-all duration-300">
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
