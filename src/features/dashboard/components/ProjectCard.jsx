import { Link } from 'react-router-dom';
import { createPageUrl } from '@shared/lib/utils';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Progress } from '@shared/ui/progress';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, ChevronRight, Rocket, Building2, GitBranch, FolderKanban } from 'lucide-react';
import { motion } from 'framer-motion';
import { TASK_STATUS, PROJECT_STATUS } from '@app/constants/index';
import { PROJECT_STATUS_COLORS } from '@app/constants/colors';
import { sanitizeHTML } from '@shared/lib/sanitize';

const templateIcons = {
  launch_large: Rocket,
  multisite: Building2,
  multiplication: GitBranch,
};

const ProjectCard = ({ project, tasks = [], teamMembers = [] }) => {
  const Icon = templateIcons[project.template_id] || FolderKanban;

  const statusConfig = PROJECT_STATUS_COLORS[project.status] || PROJECT_STATUS_COLORS[PROJECT_STATUS.PLANNING];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === TASK_STATUS.DONE).length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="h-full">
      <Link to={createPageUrl(`project/${project.id}`)} className="h-full block">
        <Card className="p-6 hover:shadow-xl transition-all duration-300 border border-border hover:border-brand-300 cursor-pointer group bg-card h-full flex flex-col justify-between overflow-hidden">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-semibold text-lg text-card-foreground group-hover:text-brand-600 transition-colors truncate"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(project.name) }}
                />
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
            <p
              className="text-muted-foreground text-sm mb-4 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(project.description) }}
            />
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-5">
            {project.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(project.location) }} />
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
