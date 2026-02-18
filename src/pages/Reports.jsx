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

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import DashboardLayout from '@layouts/DashboardLayout';
import { TASK_STATUS } from '@app/constants/index';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Mock Data (since we are just styling now)
const reports = {
  projectProgress: [
    { name: 'Alpha', progress: 75 },
    { name: 'Beta', progress: 45 },
    { name: 'Gamma', progress: 90 },
  ],
  taskDistribution: [
    { name: 'To Do', value: 10 },
    { name: 'In Progress', value: 20 },
    { name: 'Done', value: 30 },
  ],
  upcomingDeadlines: [
    { id: 1, title: 'Launch', project: 'Alpha', date: '2023-10-01', priority: 'High' },
    { id: 2, title: 'Test', project: 'Beta', date: '2023-10-05', priority: 'Medium' },
  ],
};

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
          {!projectId ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <BarChart className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Select a Project</h3>
              <p className="text-slate-500 max-w-sm text-center mt-2">
                Please select a project from the sidebar to view its detailed reports and analytics.
              </p>
            </div>
          ) : (
            <>
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
                      <h3 className="text-xl font-bold text-foreground">Overall Progress</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {completedTasks} of {totalTasks} tasks completed
                      </p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-2xl font-bold text-green-700">{overallProgress}%</span>
                    </div>
                  </div>
                  <Progress value={overallProgress} className="h-3 bg-border" />
                </Card>
              </motion.div>

              <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">Project Overview</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reports.projectProgress}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Task Status Distribution</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reports.taskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {reports.taskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Deadlines</h2>
                  <div className="space-y-4">
                    {reports.upcomingDeadlines.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                        <div>
                          <h4 className="font-medium text-foreground">{task.title}</h4>
                          <p className="text-sm text-muted-foreground">{task.project}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-orange-600 dark:text-orange-400">{task.date}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${task.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Phase Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-8"
              >
                <Card className="p-8 border border-border bg-card shadow-lg">
                  <h3 className="text-xl font-bold text-foreground mb-8">Phase Details</h3>
                  <div className="space-y-6">
                    {phaseData.map((phase, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xl border border-border hover:border-orange-200 hover:bg-accent transition-all duration-300"
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-24 text-sm font-semibold text-foreground">{phase.name}</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground mb-2">{phase.fullName}</p>
                            <div className="flex items-center gap-3">
                              <Progress value={phase.progress} className="h-2.5 flex-1 bg-border" />
                              <span className="text-sm font-bold text-orange-600 w-14 text-right">
                                {phase.progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-28">
                          {phase.completed} of {phase.total} tasks completed
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
