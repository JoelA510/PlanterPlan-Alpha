import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/lib/utils';
import { planter } from '@/api/planterClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ef4444'];

const statusLabels = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked'
};

export default function Reports() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => planter.entities.Project.filter({ id: projectId }).then(res => res[0]),
    enabled: !!projectId
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['phases', projectId],
    queryFn: () => planter.entities.Phase.filter({ root_id: projectId }),
    enabled: !!projectId
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => planter.entities.Milestone.filter({ root_id: projectId }),
    enabled: !!projectId
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => planter.entities.Task.filter({ root_id: projectId }),
    enabled: !!projectId
  });

  // Calculate stats
  const tasksByStatus = {
    completed: tasks.filter(t => t.status === 'completed').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    not_started: tasks.filter(t => t.status === 'not_started').length,
    blocked: tasks.filter(t => t.status === 'blocked').length
  };

  const pieData = [
    { name: 'Completed', value: tasksByStatus.completed, color: '#22c55e' },
    { name: 'In Progress', value: tasksByStatus.in_progress, color: '#f97316' },
    { name: 'Not Started', value: tasksByStatus.not_started, color: '#3b82f6' },
    { name: 'Blocked', value: tasksByStatus.blocked, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

  const phaseData = sortedPhases.map(phase => {
    const phaseTasks = tasks.filter(t => t.phase_id === phase.id);
    const completed = phaseTasks.filter(t => t.status === 'completed').length;
    const total = phaseTasks.length;
    return {
      name: `Phase ${phase.order}`,
      fullName: phase.name,
      completed,
      remaining: total - completed,
      total,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

  const totalTasks = tasks.length;
  const completedTasks = tasksByStatus.completed;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
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
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
              {project && (
                <p className="text-slate-600 mt-1">{project.name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-green-200 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Completed</p>
                  <p className="text-3xl font-bold text-slate-900">{tasksByStatus.completed}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">In Progress</p>
                  <p className="text-3xl font-bold text-slate-900">{tasksByStatus.in_progress}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                  <Clock className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Not Started</p>
                  <p className="text-3xl font-bold text-slate-900">{tasksByStatus.not_started}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <Circle className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Blocked</p>
                  <p className="text-3xl font-bold text-slate-900">{tasksByStatus.blocked}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-500 transition-colors">
                  <AlertTriangle className="w-6 h-6 text-red-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Card>
          </motion.div>
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
                <p className="text-sm text-slate-500 mt-1">{completedTasks} of {totalTasks} tasks completed</p>
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
            <Card className="p-8 border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-8">Task Distribution</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-72 flex items-center justify-center text-slate-500">
                  No tasks to display
                </div>
              )}
            </Card>
          </motion.div>

          {/* Phase Progress Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-8 border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-8">Progress by Phase</h3>
              {phaseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={phaseData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 'dataMax']} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-4 rounded-xl shadow-xl border-2 border-orange-200">
                              <p className="font-bold text-slate-900 mb-2">{data.fullName}</p>
                              <div className="space-y-1">
                                <p className="text-sm text-green-600 font-medium">Completed: {data.completed}</p>
                                <p className="text-sm text-slate-500">Remaining: {data.remaining}</p>
                                <p className="text-sm font-bold text-orange-600 mt-2">Progress: {data.progress}%</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" />
                    <Bar dataKey="remaining" stackId="a" fill="#e2e8f0" name="Remaining" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-72 flex items-center justify-center text-slate-500">
                  No phases to display
                </div>
              )}
            </Card>
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
                <div key={index} className="p-4 rounded-xl border border-slate-200 hover:border-orange-200 hover:bg-slate-50 transition-all duration-300">
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
  );
}
