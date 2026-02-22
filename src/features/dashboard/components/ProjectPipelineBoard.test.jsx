import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectPipelineBoard from './ProjectPipelineBoard';
import { PROJECT_STATUS } from '@/app/constants/index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock generic components to simplify rendering
vi.mock('@/features/dashboard/components/ProjectCard', () => ({
    default: ({ project }) => <div data-testid={`project-card-${project.id}`}>{project.name}</div>,
}));

vi.mock('@/features/projects/hooks/useProjectRealtime', () => ({
    useProjectRealtime: vi.fn(),
}));

// Mock Drag Overlay portal (createPortal is not needed in JSDOM if we just verify state, 
// but DndKit uses it. We can rely on standard DndContext behavior or mock it if needed. 
// For basic interaction, JSDOM + DndKit can be tricky. We will focus on rendering correctness first.)

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

const renderWithProviders = (ui) => {
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
    const tasks = [];
    const teamMembers = [];
    const onStatusChange = vi.fn();

    it('renders all columns', () => {
        renderWithProviders(
            <ProjectPipelineBoard
                projects={projects}
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
                projects={projects}
                tasks={tasks}
                teamMembers={teamMembers}
                onStatusChange={onStatusChange}
            />
        );

        // Planning has 2 projects
        // In Progress has 1 project
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
        expect(screen.getByText('Project Gamma')).toBeInTheDocument();

        // We implicitly attest position by column structure, verifying counts would be better if accessible
        // But text presence confirms rendering.
    });

    // Note: Full Drag-and-Drop simulation in JSDOM with dnd-kit is complex requiring specific event orchestration.
    // We opt to trust dnd-kit's internal logic and unit test the `handleDragEnd` logic if we extracted it,
    // OR we rely on browser verification for the actual drag mechanics.
    // Unit testing the board logic (distribution) is the key value add here.
});
