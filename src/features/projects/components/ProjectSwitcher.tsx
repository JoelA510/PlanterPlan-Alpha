import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, FolderOpen, Archive } from 'lucide-react';
import {
 DropdownMenu,
 DropdownMenuTrigger,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';
import { useTaskQuery } from '@/features/tasks/hooks/useTaskQuery';
import { PROJECT_STATUS } from '@/shared/constants/domain';
import type { Project, Task } from '@/shared/db/app.types';

const isArchived = (p: Project | Task) => p.status === PROJECT_STATUS.ARCHIVED;
const isActive = (p: Project | Task) => !isArchived(p) && !p.is_complete;

const ProjectSwitcher = () => {
 const navigate = useNavigate();
 const { projectId } = useParams<{ projectId: string }>();
 const [showArchived, setShowArchived] = useState(false);
 const { tasks = [], projectsLoading } = useTaskQuery();

 const instanceProjects = useMemo(
 () => tasks.filter((t) => t.origin === 'instance') as (Project | Task)[],
 [tasks]
 );

 const activeProjects = useMemo(
 () => instanceProjects.filter(isActive),
 [instanceProjects]
 );

 const archivedProjects = useMemo(
 () => instanceProjects.filter(isArchived),
 [instanceProjects]
 );

 const selected = projectId ? instanceProjects.find((p) => p.id === projectId) || null : null;
 const triggerLabel = selected?.title || (projectsLoading ? 'Loading…' : 'Switch Project');

 const handleSelect = (id: string) => {
 navigate(`/project/${id}`);
 };

 return (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 variant="outline"
 size="sm"
 data-testid="project-switcher-trigger"
 className="gap-2 max-w-xs justify-between bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
 >
 <span className="flex items-center gap-2 truncate">
 <FolderOpen className="w-4 h-4 text-brand-600" />
 <span className="truncate">{triggerLabel}</span>
 </span>
 <ChevronDown className="w-4 h-4 text-slate-400" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-72" data-testid="project-switcher-menu">
 <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-500">
 Active Projects
 </DropdownMenuLabel>
 {activeProjects.length === 0 ? (
 <div className="px-3 py-2 text-sm text-slate-500">No active projects.</div>
 ) : (
 activeProjects.map((p) => (
 <DropdownMenuItem
 key={p.id}
 onSelect={() => handleSelect(p.id)}
 data-testid={`project-switcher-item-${p.id}`}
 className="cursor-pointer"
 >
 <span className="truncate">{p.title}</span>
 </DropdownMenuItem>
 ))
 )}
 <DropdownMenuSeparator />
 <button
 type="button"
 onClick={() => setShowArchived((v) => !v)}
 data-testid="project-switcher-toggle-archived"
 className="flex items-center w-full gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-sm"
 >
 <Archive className="w-4 h-4" />
 {showArchived ? 'Hide archived' : 'Show archived'}
 <span className="ml-auto text-xs text-slate-400">{archivedProjects.length}</span>
 </button>
 {showArchived && (
 <div data-testid="project-switcher-archived-list">
 {archivedProjects.length === 0 ? (
 <div className="px-3 py-2 text-sm text-slate-500">No archived projects.</div>
 ) : (
 archivedProjects.map((p) => (
 <DropdownMenuItem
 key={p.id}
 onSelect={() => handleSelect(p.id)}
 data-testid={`project-switcher-archived-${p.id}`}
 className="cursor-pointer text-slate-500"
 >
 <span className="truncate">{p.title}</span>
 </DropdownMenuItem>
 ))
 )}
 </div>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 );
};

export default ProjectSwitcher;
