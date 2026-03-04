import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectPipelineBoard from './ProjectPipelineBoard';
import { PROJECT_STATUS } from '@/shared/constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TaskRow, TeamMemberRow } from '@/shared/db/app.types';

// Mock generic components to simplify rendering
vi.mock('@/features/dashboard/components/ProjectCard', () => ({
 default: ({ project }: { project: unknown }) => <div data-testid={`project-card-${(project as { id: string }).id}`}>{((project as { name: string }).name)}</div>,
}));

vi.mock('@/features/projects/hooks/useProjectRealtime', () => ({
 useProjectRealtime: vi.fn(),
}));

const queryClient = new QueryClient({
 defaultOptions: {
 queries: { retry: false },
 },
});

const renderWithProviders = (ui: React.ReactElement) => {
 return render(
 <QueryClientProvider client={queryClient}>
 {ui}
 </QueryClientProvider>
 );
};

describe('ProjectPipelineBoard', () => {
 const projects = [
 { id: '1', name: 'Project Alpha', status: PROJECT_STATUS.PLANNING },
 { id: '2', name: 'Project Beta', status: PROJECT_STATUS.IN_PROGRESS },
 { id: '3', name: 'Project Gamma', status: PROJECT_STATUS.PLANNING },
 ];
 const teamMembers: TeamMemberRow[] = [];
 const tasks: TaskRow[] = [];
 const onStatusChange = vi.fn();

 it('renders all columns', () => {
 renderWithProviders(
 <ProjectPipelineBoard
 projects={projects as unknown as TaskRow[]}
 tasks={tasks}
 teamMembers={teamMembers}
 onStatusChange={onStatusChange}
 />
 );

 expect(screen.getByText('Planning')).toBeInTheDocument();
 expect(screen.getByText('In Progress')).toBeInTheDocument();
 expect(screen.getByText('Launched')).toBeInTheDocument();
 expect(screen.getByText('Paused')).toBeInTheDocument();
 });

 it('distributes projects into correct columns', () => {
 renderWithProviders(
 <ProjectPipelineBoard
 projects={projects as unknown as TaskRow[]}
 tasks={tasks}
 teamMembers={teamMembers}
 onStatusChange={onStatusChange}
 />
 );

 expect(screen.getByText('Project Alpha')).toBeInTheDocument();
 expect(screen.getByText('Project Beta')).toBeInTheDocument();
 expect(screen.getByText('Project Gamma')).toBeInTheDocument();
 });
});
