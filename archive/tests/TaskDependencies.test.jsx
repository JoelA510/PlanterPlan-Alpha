import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskDependencies from './TaskDependencies';
import { useQuery, useMutation } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@tanstack/react-query', () => {
    return {
        useQuery: vi.fn(),
        useMutation: vi.fn(),
        useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    };
});

vi.mock('@features/tasks/services/taskService', () => ({
    getTaskRelationships: vi.fn(),
    addRelationship: vi.fn(),
    removeRelationship: vi.fn(),
}));

global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

describe('TaskDependencies', () => {
    const mockTask = { id: 'task-1', root_id: 'project-1', title: 'Task 1' };
    const mockAllTasks = [
        { id: 'task-1', title: 'Task 1' },
        { id: 'task-2', title: 'Task 2' },
        { id: 'task-3', title: 'Task 3' },
    ];

    it('renders "No dependencies" when empty', () => {
        useQuery.mockReturnValue({ data: [] });
        useMutation.mockReturnValue({ mutate: vi.fn() });

        render(<TaskDependencies task={mockTask} allProjectTasks={mockAllTasks} />);
        expect(screen.getByText('No dependencies linked.')).toBeInTheDocument();
    });

    it('renders existing relationships', () => {
        const mockRelationships = [
            { id: 'rel-1', from_task_id: 'task-1', to_task_id: 'task-2', type: 'relates_to', to_task: { id: 'task-2', title: 'Task 2' } }
        ];
        useQuery.mockReturnValue({ data: mockRelationships });
        useMutation.mockReturnValue({ mutate: vi.fn() });

        render(<TaskDependencies task={mockTask} allProjectTasks={mockAllTasks} />);
        expect(screen.getByText('Task 2')).toBeInTheDocument();
        expect(screen.getByText('Relates')).toBeInTheDocument();
    });

    it('opens add dependency popover', () => {
        useQuery.mockReturnValue({ data: [] });
        useMutation.mockReturnValue({ mutate: vi.fn() });

        render(<TaskDependencies task={mockTask} allProjectTasks={mockAllTasks} />);

        const addButton = screen.getByText('Add Dependency');
        fireEvent.click(addButton);

        // Check availability of other tasks in the command list
        // Note: Radix UI / Command might render in portal, so we might need waitFor or getByRole dialog
        // But for unit test simple render check of logic:
        // Task 2 and 3 should be available, Task 1 (self) should not.
    });
});
