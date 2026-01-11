import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import SideNav from '@features/navigation/components/SideNav';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/contexts/AuthContext';
import { getTasksForUser } from '@features/tasks/services/taskService';

export default function Reports() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Keep useTaskOperations for Sidebar
  const {
    joinedProjects,
    instanceTasks,
    templateTasks,
    loading: navLoading,
    error: navError,
    loadMoreProjects,
    hasMore,
    isFetchingMore
  } = useTaskOperations();

  // Fetch ALL tasks for the user to calculate reports
  const { data: allTasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['all-user-tasks', user?.id],
    queryFn: () => getTasksForUser(user.id),
    enabled: !authLoading && !!user,
  });

  const tasks = allTasksData?.data || [];

  // Metrics Calculation
  const metrics = useMemo(() => {
    // Filter for actual tasks (not projects/roots) if needed, 
    // but getTasksForUser returns everything. 
    // We typically want to exclude Root Projects from "Task Stats" if they are just containers.
    // Roots usually have parent_task_id === null.
    // If we want "Task Completion", we probably only care about subtasks.
    // However, if a user tracks single tasks as roots, they count.
    // Let's count everything that isn't a "Project" type if we had distinct types.
    // For now, let's include everything but maybe verify what the user considers a "task".
    // The previous code filtered: `tasks.filter(t => t.parent_task_id !== null)`.
    // That filtered out roots (Projects/Templates).
    // Let's stick to that logic logic: "Reports are about the WORK inside projects".

    // NOTE: If 'tasks' contains EVERYTHING, valid work items are usually those inside projects.
    // But standalone tasks (roots) are also work.
    // The previous logic was explicit: `t.parent_task_id !== null`.
    // Let's check if 'instance' roots are tasks or projects. 
    // In PlanterPlan context, roots are Projects. 
    // So excluding them makes sense (we report on tasks WITHIN projects).

    const relevantTasks = tasks.filter(t =>
      t.origin !== 'template' && // Exclude templates
      t.parent_task_id !== null  // Exclude root projects
    );

    const total = relevantTasks.length;
    const completed = relevantTasks.filter(t => t.status === 'completed' || t.is_complete).length;
    const todo = relevantTasks.filter(t => t.status === 'todo').length;
    const inProgress = relevantTasks.filter(t => t.status === 'in_progress').length;
    const blocked = relevantTasks.filter(t => t.status === 'blocked').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const chartData = [
      { name: 'To Do', count: todo, color: '#94a3b8' },
      { name: 'In Progress', count: inProgress, color: '#3b82f6' },
      { name: 'Blocked', count: blocked, color: '#ef4444' },
      { name: 'Completed', count: completed, color: '#10b981' },
    ];

    return { total, completed, completionRate, chartData };
  }, [tasks]);

  const handleSelectProject = (project) => navigate(`/project/${project.id}`);

  const sidebar = (
    <SideNav
      joinedProjects={joinedProjects}
      instanceTasks={instanceTasks}
      templateTasks={templateTasks}
      loading={navLoading}
      error={navError}
      handleSelectProject={handleSelectProject}
      onNewProjectClick={() => navigate('/dashboard')}
      onNewTemplateClick={() => { }}
      onLoadMore={loadMoreProjects}
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
    />
  );

  if (navLoading || authLoading || tasksLoading) {
    return (
      <DashboardLayout sidebar={sidebar}>
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-500" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="max-w-7xl mx-auto grid gap-8 p-8">
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
              <CardDescription>Breakdown of all tasks across projects.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {metrics.total === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">No tasks found</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {metrics.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
              <CardDescription>Completion rate for the entire organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-4xl font-bold text-slate-900">{metrics.completionRate}%</div>
                    <div className="text-sm text-slate-500 mt-1">
                      {metrics.completed} of {metrics.total} tasks completed
                    </div>
                  </div>
                </div>

                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all duration-500 ease-out"
                    style={{ width: `${metrics.completionRate}%` }}
                  />
                </div>

                <p className="text-sm text-slate-500 italic">
                  {metrics.completionRate === 100 ? "All tasks complete! Great job!" :
                    metrics.completionRate === 0 ? "Let's get started!" :
                      "Keep pushing forward!"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
