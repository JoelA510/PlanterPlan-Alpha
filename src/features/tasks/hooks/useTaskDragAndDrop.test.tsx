
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaskDragAndDrop } from './useTaskDragAndDrop';
import type { Task } from '@/shared/db/app.types';

// Mock useTaskDrag to capture what tasks are passed
const mockHandleDragEnd = vi.fn();
const mockTaskDragResult = { sensors: [], handleDragEnd: mockHandleDragEnd };
let capturedTasksPassedToDrag: Task[] = [];

vi.mock('./useTaskDrag', () => ({
    useTaskDrag: vi.fn((props: { tasks: Task[] }) => {
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
        ] as Task[],
        hydratedProjects: {
            'proj-1': [
                { id: 'task-1', title: 'Task 1', origin: 'instance', parent_task_id: 'proj-1', root_id: 'proj-1' },
                { id: 'task-2', title: 'Task 2', origin: 'instance', parent_task_id: 'proj-1', root_id: 'proj-1' },
                { id: 'subtask-1', title: 'Subtask 1', origin: 'instance', parent_task_id: 'task-1', root_id: 'proj-1' },
            ] as Task[],
            'task-1': [
                { id: 'subtask-1', title: 'Subtask 1', origin: 'instance', parent_task_id: 'task-1', root_id: 'proj-1' },
            ] as Task[]
        },
        setTasks: vi.fn(),
        fetchTasks: vi.fn(),
        currentUserId: 'user-123',
        updateTask: vi.fn(),
        handleOptimisticUpdate: vi.fn(),
        commitOptimisticUpdate: vi.fn(),
    };

    describe('DnD Task Aggregation (Regression)', () => {
        it('passes ALL tasks (including subtasks) to useTaskDrag', async () => {
            renderHook(() => useTaskDragAndDrop(mockProps as Parameters<typeof useTaskDragAndDrop>[0]));

            expect(capturedTasksPassedToDrag.length).toBe(5);

            const taskIds = capturedTasksPassedToDrag.map(t => t.id);

            expect(taskIds).toContain('proj-1');
            expect(taskIds).toContain('proj-2');
            expect(taskIds).toContain('task-1');
            expect(taskIds).toContain('task-2');
            expect(taskIds).toContain('subtask-1');
        });

        it('does not pass duplicate tasks to useTaskDrag', async () => {
            renderHook(() => useTaskDragAndDrop(mockProps as Parameters<typeof useTaskDragAndDrop>[0]));

            const taskIds = capturedTasksPassedToDrag.map(t => t.id);
            const uniqueIds = [...new Set(taskIds)];

            expect(taskIds.length).toBe(uniqueIds.length);
        });
    });
});
