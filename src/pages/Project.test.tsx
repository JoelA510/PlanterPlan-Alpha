/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Project from './Project';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/app/contexts/AuthContext';
import { useProjectData } from '@/features/projects/hooks/useProjectData';
import { useProjectBoard } from '@/features/projects/hooks/useProjectBoard';
import '@testing-library/jest-dom';

// Mocks
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        Loader2: () => <div data-testid="loader">Loading...</div>,
    };
});
vi.mock('react-router-dom', () => ({
    useParams: vi.fn(),
}));

vi.mock('@/app/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn(),
    })),
    useMutation: vi.fn(() => ({
        mutateAsync: vi.fn(),
    })),
}));

vi.mock('@/shared/db/client', () => ({
    supabase: {
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
        })),
        removeChannel: vi.fn(),
    },
}));

vi.mock('@/features/projects/hooks/useProjectData', () => ({
    useProjectData: vi.fn(),
}));

vi.mock('@/features/projects/hooks/useProjectBoard', () => ({
    useProjectBoard: vi.fn(),
}));

// Mock child components to keep it a unit test
vi.mock('@/features/projects/components/ProjectHeader', () => ({
    default: () => <div data-testid="project-header">Header</div>,
}));

vi.mock('@/features/projects/components/ProjectTabs', () => ({
    default: ({ activeTab, onTabChange }: any) => (
        <div data-testid="project-tabs">
            <button onClick={() => onTabChange('board')}>Board</button>
            <button onClick={() => onTabChange('people')}>People</button>
            <span>Active: {activeTab}</span>
        </div>
    ),
}));

describe('Project Page', () => {
    const mockProject = { id: 'p1', title: 'Test Project', creator: 'u1' };
    const mockUser = { id: 'u1', email: 'test@example.com' };

    beforeEach(() => {
        vi.clearAllMocks();
        (useParams as any).mockReturnValue({ projectId: 'p1' });
        (useAuth as any).mockReturnValue({ user: mockUser });
        (useProjectData as any).mockReturnValue({
            project: mockProject,
            loadingProject: false,
            phases: [],
            milestones: [],
            tasks: [],
            teamMembers: [],
        });
        (useProjectBoard as any).mockReturnValue({
            state: { activeTab: 'board', selectedPhase: null, selectedTask: null },
            actions: {
                setActiveTab: vi.fn(),
                setSelectedPhase: vi.fn(),
                setSelectedTask: vi.fn(),
            },
            handlers: {},
            computed: { mapTaskWithState: (t: any) => t },
        });
    });

    it('renders loader when project is loading', () => {
        (useProjectData as any).mockReturnValue({ loadingProject: true });
        render(<Project />);
        expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('renders project content when data is loaded', () => {
        render(<Project />);
        expect(screen.getByTestId('project-header')).toBeInTheDocument();
        expect(screen.getByTestId('project-tabs')).toBeInTheDocument();
    });

    it('switches tabs correctly', () => {
        const setActiveTab = vi.fn();
        (useProjectBoard as any).mockReturnValue({
            state: { activeTab: 'board' },
            actions: { setActiveTab },
            handlers: {},
            computed: { mapTaskWithState: (t: any) => t },
        });

        render(<Project />);
        fireEvent.click(screen.getByText('People'));
        expect(setActiveTab).toHaveBeenCalledWith('people');
    });

    it('renders phases and empty state when no milestones exist', () => {
        (useProjectData as any).mockReturnValue({
            project: mockProject,
            loadingProject: false,
            phases: [{ id: 'ph1', title: 'Phase 1', position: 1 }],
            milestones: [],
            tasks: [],
            teamMembers: [],
        });

        // We need to ensure the board state has selectedPhase set to mock rendering details
        (useProjectBoard as any).mockReturnValue({
            state: { activeTab: 'board', selectedPhase: { id: 'ph1', title: 'Phase 1', position: 1 } },
            actions: { setActiveTab: vi.fn() },
            handlers: {},
            computed: { mapTaskWithState: (t: any) => t },
        });

        render(<Project />);
        expect(screen.getByText(/Phase 1: Phase 1/i)).toBeInTheDocument();
        expect(screen.getByText(/No milestones in this phase yet/i)).toBeInTheDocument();
    });
});
