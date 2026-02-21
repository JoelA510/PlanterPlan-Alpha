/**
 * useTaskDragAndDrop.test.jsx
 * 
 * Regression tests for the useTaskDragAndDrop hook.
 * Specifically tests that DnD receives ALL tasks (including subtasks from hydratedProjects).
 * 
 * Bug Fixed (PR #102): DnD only received root tasks, so subtask dragging failed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTaskDragAndDrop } from './useTaskDragAndDrop';

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

describe('useTaskDragAndDrop', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedTasksPassedToDrag = [];
    });

    const mockProps = {
        tasks: [
            { id: 'proj-1', title: 'Project 1', origin: 'instance', parent_task_id: null },
            { id: 'proj-2', title: 'Project 2', origin: 'instance', parent_task_id: null },
        ],
        hydratedProjects: {
            'proj-1': [
                { id: 'task-1', title: 'Task 1', origin: 'instance', parent_task_id: 'proj-1', root_id: 'proj-1' },
                { id: 'task-2', title: 'Task 2', origin: 'instance', parent_task_id: 'proj-1', root_id: 'proj-1' },
                { id: 'subtask-1', title: 'Subtask 1', origin: 'instance', parent_task_id: 'task-1', root_id: 'proj-1' },
            ],
        },
        setTasks: vi.fn(),
        fetchTasks: vi.fn(),
        currentUserId: 'user-123',
        updateTask: vi.fn(),
        handleOptimisticUpdate: vi.fn(),
        commitOptimisticUpdate: vi.fn(),
    };

    describe('DnD Task Aggregation (Regression)', () => {
        /**
         * CRITICAL REGRESSION TEST
         * This test ensures the bug where only root tasks were passed to useTaskDrag doesn't recur.
         * The fix aggregates `tasks` (roots) + `hydratedProjects` (subtasks) before passing to DnD.
         */
        it('passes ALL tasks (including subtasks) to useTaskDrag', async () => {
            const { result } = renderHook(() => useTaskDragAndDrop(mockProps));

            // CRITICAL ASSERTION: useTaskDrag should receive combined tasks
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
            renderHook(() => useTaskDragAndDrop(mockProps));

            const taskIds = capturedTasksPassedToDrag.map(t => t.id);
            const uniqueIds = [...new Set(taskIds)];

            expect(taskIds.length).toBe(uniqueIds.length);
        });
    });
});
