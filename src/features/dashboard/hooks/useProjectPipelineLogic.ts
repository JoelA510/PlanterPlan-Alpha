import { useState, useMemo } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { Project, Task, TeamMemberRow } from '@/shared/db/app.types';
import { PROJECT_STATUS } from '@/shared/constants';
import { COLUMNS, bucketizeProjects, groupTasksByProject, groupMembersByProject, determineNewStatus } from '../lib/pipelineMath';

export function useProjectPipelineLogic(
  projects: Project[],
  tasks: Task[],
  teamMembers: TeamMemberRow[],
  onStatusChange: (projectId: string, status: string) => void
) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const columns = useMemo(() => bucketizeProjects(projects, COLUMNS), [projects]);
  const tasksByProjectId = useMemo(() => groupTasksByProject(tasks), [tasks]);
  const teamMembersByProjectId = useMemo(() => groupMembersByProject(teamMembers), [teamMembers]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const project = projects.find(p => p.id === active.id);
    setActiveProject(project || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) return;

    const projectId = active.id;
    const newStatus = determineNewStatus(over.id, projects);

    if (newStatus) {
      const currentProject = projects.find(p => p.id === projectId);
      if (currentProject && (currentProject.status || PROJECT_STATUS.PLANNING) !== newStatus) {
        onStatusChange(projectId as string, newStatus);
      }
    }
  };

  return {
    columns,
    tasksByProjectId,
    teamMembersByProjectId,
    activeProject,
    handleDragStart,
    handleDragEnd
  };
}
