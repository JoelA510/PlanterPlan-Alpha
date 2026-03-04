import { PROJECT_STATUS } from '@/shared/constants';
import { PROJECT_STATUS_COLORS } from '@/shared/constants/colors';
import type { Project, Task, TeamMemberRow } from '@/shared/db/app.types';

export const COLUMNS = [
  { id: PROJECT_STATUS.PLANNING, title: 'Planning', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.PLANNING] },
  { id: PROJECT_STATUS.IN_PROGRESS, title: 'In Progress', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.IN_PROGRESS] },
  { id: PROJECT_STATUS.LAUNCHED, title: 'Launched', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.LAUNCHED] },
  { id: PROJECT_STATUS.PAUSED, title: 'Paused', ...PROJECT_STATUS_COLORS[PROJECT_STATUS.PAUSED] },
];

export const bucketizeProjects = (projects: Project[], columns: typeof COLUMNS) => {
  const buckets = projects.reduce((acc: Record<string, Project[]>, project) => {
    const status = project.status || PROJECT_STATUS.PLANNING;
    if (!acc[status]) acc[status] = [];
    acc[status].push(project);
    return acc;
  }, {});

  return columns.map(c => ({
    ...c,
    projects: buckets[c.id] || []
  }));
};

export const groupTasksByProject = (tasks: Task[]) => {
  const map: Record<string, Task[]> = {};
  for (const t of tasks) {
    const pid = t.root_id ?? 'unassigned';
    if (!map[pid]) map[pid] = [];
    map[pid].push(t);
  }
  return map;
};

export const groupMembersByProject = (teamMembers: TeamMemberRow[]) => {
  const map: Record<string, TeamMemberRow[]> = {};
  for (const m of teamMembers) {
    const pid = m.project_id ?? 'unassigned';
    if (!map[pid]) map[pid] = [];
    map[pid].push(m);
  }
  return map;
};

export const determineNewStatus = (overId: string | number, projects: Project[]): string | null => {
  if (typeof overId === 'string' && (Object.values(PROJECT_STATUS) as readonly string[]).includes(overId as any)) {
    return overId;
  }
  const overProject = projects.find(p => p.id === overId);
  if (overProject) {
    return overProject.status || PROJECT_STATUS.PLANNING;
  }
  return null;
};
