import { useMemo } from 'react';
import {
 Users,
 Calendar,
 FolderKanban,
 CheckCircle2,
} from 'lucide-react';
import { Card } from '@/shared/ui/card';
import type { TaskRow } from '@/shared/db/app.types';

interface StatsOverviewProps {
 projects: TaskRow[];
 tasks: TaskRow[];
}

export default function StatsOverview({ projects, tasks }: StatsOverviewProps) {
 const stats = useMemo(() => {
 const totalProjects = projects.length;
 const completedTasks = tasks.filter((t) => t.status === 'completed').length;
 const activeTasks = tasks.filter((t) => t.status !== 'completed').length;

 return [
 {
 label: 'Total Projects',
 value: totalProjects,
 icon: FolderKanban,
 // Design System: Primary/Brand
 bgColor: 'bg-brand-50',
 textColor: 'text-brand-600',
 borderColor: 'group-hover:border-brand-300',
 href: '/reports', // Mapping to Reports as Project List
 },
 {
 label: 'Active Tasks',
 value: activeTasks,
 icon: Calendar,
 // Design System: Info/Alert
 bgColor: 'bg-blue-50',
 textColor: 'text-blue-600',
 borderColor: 'group-hover:border-blue-300',
 },
 {
 label: 'Completed',
 value: completedTasks,
 icon: CheckCircle2,
 // Design System: Success
 bgColor: 'bg-emerald-50',
 textColor: 'text-emerald-600',
 borderColor: 'group-hover:border-emerald-300',
 },
 {
 label: 'Team Activity',
 value: '12',
 icon: Users,
 // Design System: Neutral
 bgColor: 'bg-indigo-50',
 textColor: 'text-indigo-600',
 borderColor: 'group-hover:border-indigo-300',
 },
 ];
 }, [projects, tasks]);

 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 {stats.map((stat) => (
 <Card
 key={stat.label}
 data-testid="stats-card"
 className={`p-6 border-2 border-slate-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group cursor-default ${stat.borderColor}`}
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
 {stat.label}
 </p>
 <h3 className="text-3xl font-black text-slate-900 tracking-tight">
 {stat.value}
 </h3>
 </div>
 <div
 className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${stat.bgColor} group-hover:scale-110`}
 >
 <stat.icon className={`w-7 h-7 ${stat.textColor} transition-colors`} />
 </div>
 </div>
 </Card>
 ))}
 </div>
 );
}
