import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Project from '@pages/Project';
import { useProjectData } from '@features/projects/hooks/useProjectData';
import { useTaskSubscription } from '@features/tasks/hooks/useTaskSubscription';
import { projectService } from '@features/projects/services/projectService';
import { planter } from '@shared/api/planterClient';
import { DndContext } from '@dnd-kit/core';

// Mocks
vi.mock('@features/projects/hooks/useProjectData');
vi.mock('@features/tasks/hooks/useTaskSubscription');
vi.mock('@features/projects/services/projectService');
vi.mock('@shared/api/planterClient');

// Mock child components to isolate Project.jsx logic
vi.mock('@features/projects/components/ProjectHeader', () => ({
    default: () => <div data-testid="project-header">Header</div>
}));
vi.mock('@features/projects/components/ProjectTabs', () => ({
    default: ({ onTabChange }) => (
        <div>
            <button onClick={() => onTabChange('board')}>Board</button>
        </div>
    )
}));
vi.mock('@layouts/DashboardLayout', () => ({
    default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>
}));

// Mock Drag and drop to just render children
vi.mock('@dnd-kit/core', async () => {
    const actual = await vi.importActual('@dnd-kit/core');
    return {
        ...actual,
        DndContext: ({ children }) => <div>{children}</div>,
        DragOverlay: () => null,
    };
});

// Mock MilestoneSection to verify props passed
vi.mock('@features/projects/components/MilestoneSection', () => ({
    default: ({ tasks, onAddChildTask }) => (
        <div data-testid="milestone-section">
            {tasks.map(t => (
                <div key={t.id} data-testid={`task-${t.id}`}>
                    {t.title}
                    <button
                        data-testid={`add-child-${t.id}`}
                        onClick={() => onAddChildTask(t)}
                    >
                        +
                    </button>
                    {t.isAddingInline && (
                        <input
                            data-testid={`inline-input-${t.id}`}
                            placeholder="New Task"
                        />
                    )}
                </div>
            ))}
        </div>
    )
}));

describe('Inline Task Creation', () => {
    const mockTasks = [
        { id: 't1', title: 'Task 1', parent_task_id: 'm1', position: 100 },
    ];

    // Setup generic mocks
    beforeEach(() => {
        useProjectData.mockReturnValue({
            project: { id: 'p1', title: 'Test Project' },
            loadingProject: false,
            phases: [{ id: 'ph1', position: 1, title: 'Phase 1' }],
            milestones: [{ id: 'm1', parent_task_id: 'ph1', position: 1, title: 'Milestone 1' }],
            tasks: mockTasks,
            teamMembers: [],
        });
        useTaskSubscription.mockImplementation(() => { });
        planter.entities.Task.create.mockResolvedValue({ data: { id: 'new-task' }, error: null });
    });

    it('activates inline input when add child is triggered', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });

        const wrapper = ({ children }) => (
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/project/p1']}>
                    <Routes>
                        <Route path="/project/:projectId" element={children} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );

        render(<Project />, { wrapper });

        // This test mostly verifies that the Project page *manages* the state correctly.
        // Since we mocked MilestoneSection, we are testing the prop passing and state update.

        // 1. Initial render - no inline input
        expect(screen.queryByTestId('inline-input-t1')).not.toBeInTheDocument();

        // 2. Click Add Child
        fireEvent.click(screen.getByTestId('add-child-t1'));

        // 3. We need to mock the re-render with the new state
        // In a real integration test without full component mocks, the setExpandedTaskId would trigger a re-render.
        // However, useProjectData returns a static list here. 
        // The Project component maps tasks and adds 'isAddingInline' based on internal state.

        // Wait for state update
        await waitFor(() => {
            // Note: Since we mocked MilestoneSection to read `t.isAddingInline`, success means Project.jsx
            // correctly correctly mapped the tasks with that flag.
            expect(screen.getByTestId('inline-input-t1')).toBeInTheDocument();
        });
    });
});
