
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/lib/utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from 'date-fns';
import {
    Calendar,
    MapPin,
    Users,
    ChevronRight,
    Rocket,
    Building2,
    GitBranch
} from 'lucide-react';
import { motion } from 'framer-motion';

const templateIcons = {
    launch_large: Rocket,
    multisite: Building2,
    multiplication: GitBranch
};

const templateLabels = {
    launch_large: "Launch Large",
    multisite: "Multisite",
    multiplication: "Multiplication"
};

const statusColors = {
    planning: "bg-indigo-100 text-indigo-700",
    in_progress: "bg-orange-100 text-orange-700",
    launched: "bg-green-100 text-green-700",
    paused: "bg-slate-100 text-slate-700"
};

export default function ProjectCard({ project, tasks = [], teamMembers = [] }) {
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const Icon = templateIcons[project.template] || Rocket;

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
        >
            <Link to={createPageUrl(`project/${project.id}`)}>
                <Card className="p-6 hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-orange-300 cursor-pointer group bg-white">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-slate-900 group-hover:text-orange-600 transition-colors">
                                    {project.name}
                                </h3>
                                <Badge variant="secondary" className={`${statusColors[project.status]} text-xs mt-1`}>
                                    {project.status?.replace('_', ' ')}
                                </Badge>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                    </div>

                    {project.description && (
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                            {project.description}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-5">
                        {project.location && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                <span>{project.location}</span>
                            </div>
                        )}
                        {project.launch_date && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(project.launch_date), 'MMM d, yyyy')}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span>{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Progress</span>
                            <span className="font-medium text-slate-900">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2 bg-slate-100" />
                        <p className="text-xs text-slate-500">
                            {completedTasks} of {totalTasks} tasks completed
                        </p>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}
