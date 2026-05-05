import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Dashboard mounts a lot of downstream widgets. Replace the heavy ones with
// no-op stubs so the test is focused on the header button wiring.
vi.mock('@/features/projects/hooks/useProjectRealtime', () => ({
    useProjectRealtime: () => undefined,
}));
vi.mock('@/features/projects/hooks/useProjectMutations', () => ({
    useUpdateProjectStatus: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/features/dashboard/components/StatsOverview', () => ({
    default: () => null,
}));
vi.mock('@/features/dashboard/components/ProjectPipelineBoard', () => ({
    default: () => null,
}));
vi.mock('@/features/mobile/components/MobileAgenda', () => ({
    default: () => null,
}));
vi.mock('@/pages/components/OnboardingWizard', () => ({
    default: ({
        open,
        onCreateProject,
    }: {
        open: boolean;
        onCreateProject: (data: { title: string; due_date: string | null; template: string; status: string }) => Promise<void>;
    }) => (
        open ? (
            <button
                type="button"
                data-testid="finish-onboarding"
                onClick={() => void onCreateProject({
                    title: 'Onboarding Church',
                    due_date: '2026-07-04',
                    template: 'launch_large',
                    status: 'planning',
                })}
            >
                finish onboarding
            </button>
        ) : null
    ),
}));

const handleDismissWizard = vi.fn();

const dashboardState = {
    isLoading: false,
    isError: false,
    error: null,
    user: { id: 'u1', email: 'u1@example.com' },
    wizardDismissed: true,
    searchQuery: '',
    selectedProjectId: null,
};

const dashboardData = {
    projects: [{ id: 'p1', title: 'Alpha project' }],
    activeProjects: [],
    archivedProjects: [],
    allTasks: [],
    filteredTasks: [],
    teamMembers: [],
};

vi.mock('@/features/dashboard/hooks/useDashboard', () => ({
    useDashboard: () => ({
        state: dashboardState,
        data: dashboardData,
        actions: {
            setSearchQuery: vi.fn(),
            setSelectedProjectId: vi.fn(),
            handleDismissWizard,
        },
    }),
}));

import Dashboard from '@/pages/Dashboard';

function LocationDisplay() {
    const location = useLocation();
    return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderDashboard() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={qc}>
                <MemoryRouter initialEntries={['/dashboard']}>{children}</MemoryRouter>
            </QueryClientProvider>
        );
    }
    return render(
        <>
            <Dashboard />
            <LocationDisplay />
        </>,
        { wrapper: Wrapper },
    );
}

describe('Dashboard header (Wave 32)', () => {
    beforeEach(() => {
        handleDismissWizard.mockReset();
        dashboardState.wizardDismissed = true;
        dashboardData.projects = [{ id: 'p1', title: 'Alpha project' }];
    });

    it('renders both "New Project" and "New Template" buttons in the header', () => {
        renderDashboard();
        expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument();
    });

    it('routes template creation to the creation host on /tasks', () => {
        renderDashboard();
        fireEvent.click(screen.getByRole('button', { name: /new template/i }));
        expect(screen.getByTestId('location')).toHaveTextContent('/tasks?action=new-template');
    });

    it('routes project creation to the creation host on /tasks', () => {
        renderDashboard();
        fireEvent.click(screen.getByRole('button', { name: /new project/i }));
        expect(screen.getByTestId('location')).toHaveTextContent('/tasks?action=new-project');
    });

    it('preserves onboarding project inputs when routing to the creation host', () => {
        dashboardState.wizardDismissed = false;
        dashboardData.projects = [];

        renderDashboard();
        fireEvent.click(screen.getByTestId('finish-onboarding'));

        const locationText = screen.getByTestId('location').textContent ?? '';
        const [, query = ''] = locationText.split('?');
        const params = new URLSearchParams(query);

        expect(locationText).toMatch(/^\/tasks\?/);
        expect(params.get('action')).toBe('new-project');
        expect(params.get('title')).toBe('Onboarding Church');
        expect(params.get('start_date')).toBe('2026-07-04');
        expect(params.get('template')).toBe('launch_large');
        expect(handleDismissWizard).toHaveBeenCalledTimes(1);
    });
});
