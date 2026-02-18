/**
 * useTaskBoard.test.jsx
 * 
 * Regression tests for the useTaskBoard hook.
 * Specifically tests that DnD receives ALL tasks (including subtasks from hydratedProjects).
 * 
 * Bug Fixed (PR #102): DnD only received root tasks, so subtask dragging failed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTaskBoard } from './useTaskBoard';
import { AuthContext } from '@/app/contexts/AuthContext';
import { ToastProvider } from '@/app/contexts/ToastContext';

// Mock useTaskOperations
vi.mock('@/features/tasks/hooks/useTaskOperations', () => ({
    useTaskOperations: vi.fn(() => ({
        tasks: [
            { id: 'proj-1', title: 'Project 1', origin: 'instance', parent_task_id: null },
            { id: 'proj-2', title: 'Project 2', origin: 'instance', parent_task_id: null },
        ],
        setTasks: vi.fn(),
        joinedProjects: [],
        hydratedProjects: {
            'proj-1': [
                { id: 'task-1', title: 'Task 1', origin: 'instance', parent_task_id: 'proj-1', root_id: 'proj-1' },
                { id: 'task-2', title: 'Task 2', origin: 'instance', parent_task_id: 'proj-1', root_id: 'proj-1' },
                { id: 'subtask-1', title: 'Subtask 1', origin: 'instance', parent_task_id: 'task-1', root_id: 'proj-1' },
            ],
        },
        loading: false,
        error: null,
        joinedError: null,
        currentUserId: 'user-123',
        fetchTasks: vi.fn(),
        createProject: vi.fn(),
        createTaskOrUpdate: vi.fn(),
        deleteTask: vi.fn(),
        updateTask: vi.fn(),
        fetchProjectDetails: vi.fn(),
        refreshProjectDetails: vi.fn(),
        findTask: vi.fn(),
        hasMore: false,
        isFetchingMore: false,
        loadMoreProjects: vi.fn(),
    })),
}));

// Mock useTaskDrag to capture what tasks are passed
const mockHandleDragEnd = vi.fn();
const mockTaskDragResult = { sensors: [], handleDragEnd: mockHandleDragEnd };
let capturedTasksPassedToDrag = [];

vi.mock('@/features/task-drag', () => ({
    useTaskDrag: vi.fn((props) => {
        capturedTasksPassedToDrag = props.tasks;
        return mockTaskDragResult;
    }),
}));

// Mock ToastContext
vi.mock('@/app/contexts/ToastContext', () => ({
    useToast: () => ({ addToast: vi.fn() }),
    ToastProvider: ({ children }) => children,
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    const mockAuth = {
        user: { id: 'user-123' },
        session: { user: { id: 'user-123' } },
        loading: false,
    };

    const Wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={mockAuth}>
                <ToastProvider>{children}</ToastProvider>
            </AuthContext.Provider>
        </QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
};

describe('useTaskBoard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedTasksPassedToDrag = [];
    });

    describe('DnD Task Aggregation (Regression)', () => {
        /**
         * CRITICAL REGRESSION TEST
         * This test ensures the bug where only root tasks were passed to useTaskDrag doesn't recur.
         * The fix aggregates `tasks` (roots) + `hydratedProjects` (subtasks) before passing to DnD.
         */
        it('passes ALL tasks (including subtasks) to useTaskDrag', async () => {
            const { result } = renderHook(() => useTaskBoard(), { wrapper: createWrapper() });

            // Wait for hook to initialize
            await waitFor(() => {
                expect(result.current).toBeDefined();
            });

            // CRITICAL ASSERTION: useTaskDrag should receive combined tasks
            // Root projects: proj-1, proj-2
            // Hydrated tasks: task-1, task-2, subtask-1
            expect(capturedTasksPassedToDrag.length).toBe(5);

            const taskIds = capturedTasksPassedToDrag.map(t => t.id);

            // Should include root projects
            expect(taskIds).toContain('proj-1');
            expect(taskIds).toContain('proj-2');

            // Should include hydrated tasks
            expect(taskIds).toContain('task-1');
            expect(taskIds).toContain('task-2');

            // Should include deeply nested subtasks
            expect(taskIds).toContain('subtask-1');
        });

        it('does not pass duplicate tasks to useTaskDrag', async () => {
            const { result } = renderHook(() => useTaskBoard(), { wrapper: createWrapper() });

            await waitFor(() => {
                expect(result.current).toBeDefined();
            });

            const taskIds = capturedTasksPassedToDrag.map(t => t.id);
            const uniqueIds = [...new Set(taskIds)];

            expect(taskIds.length).toBe(uniqueIds.length);
        });
    });

    describe('Expansion State', () => {
        it('provides handleToggleExpand function', async () => {
            const { result } = renderHook(() => useTaskBoard(), { wrapper: createWrapper() });

            await waitFor(() => {
                expect(result.current.handleToggleExpand).toBeDefined();
            });

            expect(typeof result.current.handleToggleExpand).toBe('function');
        });
    });

    describe('Active Project', () => {
        it('initializes with no active project', async () => {
            const { result } = renderHook(() => useTaskBoard(), { wrapper: createWrapper() });

            await waitFor(() => {
                expect(result.current).toBeDefined();
            });

            expect(result.current.activeProjectId).toBeNull();
            expect(result.current.activeProject).toBeNull();
        });

        it('provides handleSelectProject function', async () => {
            const { result } = renderHook(() => useTaskBoard(), { wrapper: createWrapper() });

            await waitFor(() => {
                expect(result.current.handleSelectProject).toBeDefined();
            });

            expect(typeof result.current.handleSelectProject).toBe('function');
        });
    });
});
