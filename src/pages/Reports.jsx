import { Link } from 'react-router-dom';
import { createPageUrl } from '@shared/lib/utils';
import { planter } from '@shared/api/planterClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { Progress } from '@shared/ui/progress';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import StatusPieChart from '@features/reports/components/StatusPieChart';
import PhaseBarChart from '@features/reports/components/PhaseBarChart';

import DashboardLayout from '@layouts/DashboardLayout';
import { TASK_STATUS } from '@app/constants/index';

export default function Reports() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => planter.entities.Project.filter({ id: projectId }).then((res) => res[0]),
    enabled: !!projectId,
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['phases', projectId],
    queryFn: () => planter.entities.Phase.filter({ root_id: projectId }),
    enabled: !!projectId,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => planter.entities.Task.filter({ root_id: projectId }),
    enabled: !!projectId,
  });

  // Calculate stats
  const tasksByStatus = {
    completed: tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length,
    in_progress: tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length,
    not_started: tasks.filter((t) => t.status === TASK_STATUS.TODO).length,
    blocked: tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length,
  };

  const statsConfig = [
    {
      label: 'Completed',
      value: tasksByStatus.completed,
      icon: CheckCircle2,
      borderClass: 'border-green-200',
      bgClass: 'bg-green-100',
      hoverBgClass: 'bg-green-500',
      textClass: 'text-green-600',
    },
    {
      label: 'In Progress',
      value: tasksByStatus.in_progress,
      icon: Clock,
      borderClass: 'border-orange-200',
      bgClass: 'bg-orange-100',
      hoverBgClass: 'bg-orange-500',
      textClass: 'text-orange-600',
    },
    {
      label: 'Not Started',
      value: tasksByStatus.not_started,
      icon: Circle,
      borderClass: 'border-indigo-200',
      bgClass: 'bg-indigo-100',
      hoverBgClass: 'bg-indigo-500',
      textClass: 'text-indigo-600',
    },
    {
      label: 'Blocked',
      value: tasksByStatus.blocked,
      icon: AlertTriangle,
      borderClass: 'border-red-200',
      bgClass: 'bg-red-100',
      hoverBgClass: 'bg-red-500',
      textClass: 'text-red-600',
    },
  ];

  const pieData = [
    { name: 'Completed', value: tasksByStatus.completed, color: 'var(--color-emerald-500)' },
    { name: 'In Progress', value: tasksByStatus.in_progress, color: 'var(--color-orange-500)' },
    { name: 'Not Started', value: tasksByStatus.not_started, color: 'var(--color-indigo-500)' },
    { name: 'Blocked', value: tasksByStatus.blocked, color: 'var(--color-rose-500)' },
  ].filter((d) => d.value > 0);

  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

  const phaseData = sortedPhases.map((phase) => {
    const phaseTasks = tasks.filter((t) => t.phase_id === phase.id);
    const completed = phaseTasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
    const total = phaseTasks.length;
    return {
      name: `Phase ${phase.order}`,
      fullName: phase.name,
      completed,
      remaining: total - completed,
      total,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const totalTasks = tasks.length;
  const completedTasks = tasksByStatus.completed;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout selectedTaskId={projectId}>
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl(`Project?id=${projectId}`)}>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Reports & Analytics
                </h1>
                {project && <p className="text-slate-600 mt-1">{project.name}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {statsConfig.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`p-6 border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 group hover:${stat.borderClass}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${stat.bgClass} group-hover:${stat.hoverBgClass}`}>
                      <stat.icon className={`w-6 h-6 transition-colors ${stat.textClass} group-hover:text-white`} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Overall Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-8 mb-10 border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-md hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Overall Progress</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {completedTasks} of {totalTasks} tasks completed
                  </p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-700">{overallProgress}%</span>
                </div>
              </div>
              <Progress value={overallProgress} className="h-3 bg-slate-200" />
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Task Distribution Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <StatusPieChart data={pieData} />
            </motion.div>

            {/* Phase Progress Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <PhaseBarChart data={phaseData} />
            </motion.div>
          </div>

          {/* Phase Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8"
          >
            <Card className="p-8 border border-slate-200 bg-white shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 mb-8">Phase Details</h3>
              <div className="space-y-6">
                {phaseData.map((phase, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-slate-200 hover:border-orange-200 hover:bg-slate-50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-24 text-sm font-semibold text-slate-700">{phase.name}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 mb-2">{phase.fullName}</p>
                        <div className="flex items-center gap-3">
                          <Progress value={phase.progress} className="h-2.5 flex-1 bg-slate-200" />
                          <span className="text-sm font-bold text-orange-600 w-14 text-right">
                            {phase.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 ml-28">
                      {phase.completed} of {phase.total} tasks completed
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
