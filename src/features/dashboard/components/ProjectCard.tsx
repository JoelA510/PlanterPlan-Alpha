import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { formatDate } from '@/shared/lib/date-engine';
import { Calendar, MapPin, Users, ChevronRight, Rocket, Building2, GitBranch, FolderKanban } from 'lucide-react';
import { motion } from 'framer-motion';
import { TASK_STATUS, PROJECT_STATUS } from '@/shared/constants';
import { PROJECT_STATUS_COLORS } from '@/shared/constants/colors';
import type { Project, Task, TeamMemberRow } from '@/shared/db/app.types';

const templateIcons: Record<string, React.ElementType> = {
 launch_large: Rocket,
 multisite: Building2,
 multiplication: GitBranch,
};

interface ProjectCardProps {
 project: Project;
 tasks?: Task[];
 teamMembers?: TeamMemberRow[];
}

const ProjectCard = ({ project, tasks = [], teamMembers = [] }: ProjectCardProps) => {
  const settings = project.settings as Record<string, unknown> | undefined;
  const templateId = settings?.template_id as string | undefined;
 const Icon = templateIcons[templateId as string] || FolderKanban;

  const statusConfig = PROJECT_STATUS_COLORS[project.status as keyof typeof PROJECT_STATUS_COLORS] || PROJECT_STATUS_COLORS[PROJECT_STATUS.PLANNING];

 const totalTasks = tasks.length;
 const completedTasks = tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length;
 const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

 return (
 <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="h-full">
 <Link to={`/project/${project.id}`} className="h-full block">
 <Card className="p-4 sm:p-6 hover:shadow-xl transition-all duration-300 border border-border hover:border-brand-300 cursor-pointer group bg-card h-full flex flex-col justify-between overflow-hidden">
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-4 min-w-0">
 <div className="w-12 h-12 flex-shrink-0 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
 <Icon className="w-6 h-6 text-white" />
 </div>
 <div className="min-w-0 flex-1">
 <h3 className="font-semibold text-lg text-card-foreground group-hover:text-brand-600 transition-colors truncate">
 {project.name}
 </h3>
 <Badge
 variant="secondary"
 className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border text-[10px] font-bold mt-1 uppercase tracking-wider`}
 >
 {project.status?.replace('_', ' ')}
 </Badge>
 </div>
 </div>
 <ChevronRight className="w-5 h-5 flex-shrink-0 text-muted-foreground group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
 </div>

 {project.description && (
 <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
 {project.description}
 </p>
 )}

 <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-5">
 {project.location && (
 <div className="flex items-center gap-1.5">
 <MapPin className="w-4 h-4" />
 <span>{project.location}</span>
 </div>
 )}
 {project.launch_date && (
 <div className="flex items-center gap-1.5">
 <Calendar className="w-4 h-4" />
 <span>{formatDate(project.launch_date, 'MMM d, yyyy')}</span>
 </div>
 )}
 <div className="flex items-center gap-1.5">
 <Users className="w-4 h-4" />
 <span>
 {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
 </span>
 </div>
 </div>

 <div className="space-y-2">
 <div className="flex items-center justify-between text-sm">
 <span className="text-muted-foreground">Progress</span>
 <span className="font-medium text-card-foreground">{progressPercent}%</span>
 </div>
 <Progress value={progressPercent} className="h-2 bg-muted" />
 <p className="text-xs text-muted-foreground">
 {completedTasks} of {totalTasks} tasks completed
 </p>
 </div>
 </Card>
 </Link>
 </motion.div>
 );
}

export default ProjectCard;
