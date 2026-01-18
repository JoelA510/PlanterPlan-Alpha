import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@shared/lib/utils';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Progress } from '@shared/ui/progress';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  BarChart2,
  Rocket,
  Building2,
  GitBranch,
  Settings,
  Download,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TASK_STATUS, PROJECT_STATUS } from '@app/constants/index';
import EditProjectModal from './EditProjectModal';
import { exportProjectToCSV } from '@shared/lib/export-utils';

const templateIcons = {
  launch_large: Rocket,
  multisite: Building2,
  multiplication: GitBranch,
};

const statusColors = {
  [PROJECT_STATUS.PLANNING]: 'bg-indigo-100 text-indigo-700',
  [PROJECT_STATUS.IN_PROGRESS]: 'bg-brand-100 text-brand-700',
  [PROJECT_STATUS.LAUNCHED]: 'bg-emerald-100 text-emerald-700',
  [PROJECT_STATUS.PAUSED]: 'bg-slate-100 text-slate-700',
};

export default function ProjectHeader({ project, tasks = [], teamMembers = [], onInviteMember }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const Icon = templateIcons[project.template] || Rocket;
  const completedTasks = tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl('dashboard')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                <Badge className={statusColors[project.status]}>
                  {project.status?.replace('_', ' ')}
                </Badge>
              </div>
              {project.description && <p className="text-slate-600 mt-1">{project.description}</p>}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
              <Search className="w-4 h-4 mr-2 text-slate-400" />
              <span className="lg:hidden">Search</span>
              <span className="hidden lg:inline text-slate-400 text-xs">⌘K</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsEditModalOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={() => exportProjectToCSV(project, tasks)}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Link to={createPageUrl(`reports?project=${project.id}`)}>
              <Button variant="outline" size="sm">
                <BarChart2 className="w-4 h-4 mr-2" />
                Reports
              </Button>
            </Link>
            <Link to={createPageUrl(`team?project=${project.id}`)}>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Team
              </Button>
            </Link>
            <Button variant="default" size="sm" onClick={onInviteMember} className="ml-2 bg-brand-500 hover:bg-brand-600 text-white">
              <Users className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            {project.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{project.location}</span>
              </div>
            )}
            {project.launch_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Launch: {format(new Date(project.launch_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            <Users className="w-4 h-4 text-slate-400" />
            <span>
              {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Draggable Avatars */}
          <div className="flex items-center -space-x-2 overflow-hidden py-1 pl-1">
            {teamMembers.slice(0, 5).map(member => (
              <DraggableAvatar key={member.id} member={member} />
            ))}
            {teamMembers.length > 5 && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-xs font-medium text-slate-500 z-0">
                +{teamMembers.length - 5}
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center gap-3 min-w-52 max-w-md ml-auto">
            <Progress value={progress} className="h-2 flex-1 bg-slate-100" />
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
              {progress}% complete
            </span>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <EditProjectModal
          project={project}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </motion.div>
  );
}

import { useDraggable } from '@dnd-kit/core';

function DraggableAvatar({ member }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `member-${member.id}`, // Unique ID
    data: {
      type: 'User',
      member,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Initials
  const initials = (member.first_name?.[0] || '') + (member.last_name?.[0] || '') || '?';
  const displayName = member.first_name ? `${member.first_name} ${member.last_name}` : member.email;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-slate-200 text-xs font-medium text-slate-600 cursor-grab active:cursor-grabbing hover:z-10 transition-transform ${isDragging ? 'opacity-50 z-50' : ''}`}
      title={`Drag to assign ${displayName}`}
    >
      {member.avatar_url ? (
        <img src={member.avatar_url} alt={displayName} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
