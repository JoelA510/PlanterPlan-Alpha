import { Link, useNavigate } from 'react-router-dom';
import { planter } from '@/shared/api/planterClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import { ArrowLeft, Loader2, BarChart, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/shared/contexts/AuthContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';

import {
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

import { useProjectReports } from '@/features/projects/hooks/useProjectReports';
import type { TaskRow } from '@/shared/db/app.types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Reports() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    const navigate = useNavigate();
    const { user } = useAuth();

    const { data: project } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => planter.entities.Project.filter({ id: projectId }).then((res: TaskRow[]) => res[0]),
        enabled: !!projectId,
    });

    const { data: allProjects = [] } = useQuery({
        queryKey: ['projects', user?.id],
        queryFn: async () => planter.entities.Project.filter({}),
        enabled: !!user,
    });

    const { data: allTasks = [], isLoading } = useQuery<TaskRow[]>({
        queryKey: ['tasks', projectId],
        queryFn: () => planter.entities.Task.filter({ root_id: projectId }),
        enabled: !!projectId,
    });

    // Phases are direct children of the project
    const phases = allTasks.filter((t) => t.parent_task_id === projectId);
    // Tasks are everything else
    const tasks = allTasks.filter((t) => t.parent_task_id !== projectId);

    const {
        statsConfig,
        overallProgress,
        completedTasks,
        totalTasks,
        phaseData,
        taskDistribution,
        milestones,
    } = useProjectReports(tasks, phases);

    if (isLoading) {
        return (
            <>
                <div className="flex justify-center py-20">
                    <Loader2 data-testid="loading-spinner" className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            </>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-slate-50">
                <div className="bg-white border-b border-slate-200 shadow-sm">
                    <div className="max-w-6xl mx-auto px-4 py-8">
                        <div className="flex items-center gap-4">
                            <Link to={`/Project?id=${projectId}`}>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    Reports & Analytics
                                </h1>
                                {project && <p className="text-slate-600 mt-1">{project.title}</p>}
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
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Project</h3>
                            <p className="text-slate-500 max-w-sm text-center mb-6">
                                Choose a project below to view its detailed reports and analytics.
                            </p>

                            <div className="w-full max-w-sm">
                                <Select
                                    onValueChange={(value) => {
                                        navigate(`/reports?project=${value}`);
                                    }}
                                >
                                    <SelectTrigger className="w-full bg-white">
                                        <SelectValue placeholder="Select a project..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allProjects.map((p: TaskRow) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.title}
                                            </SelectItem>
                                        ))}
                                        {allProjects.length === 0 && (
                                            <SelectItem value="none" disabled>
                                                No projects available
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <>
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

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card className="p-8 mb-10 border border-slate-200 bg-slate-50/50 shadow-md hover:shadow-xl transition-all duration-300">
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

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                                    <h2 className="text-lg font-semibold text-foreground mb-4">Task Status Distribution</h2>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={taskDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {taskDistribution.map((_entry, index) => (
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
                                        {milestones.length === 0 && (
                                            <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
                                        )}
                                        {milestones.slice(0, 5).map((milestone) => (
                                            <div key={milestone.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-medium text-foreground truncate">{milestone.title}</h4>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {milestone.due_date || 'No due date'}
                                                    </p>
                                                </div>
                                                <div className="text-right ml-4 flex-shrink-0">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        milestone.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {milestone.progress}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

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
                                                    {phase.completed} of {phase.total} milestones completed
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
        </>
    );
}
