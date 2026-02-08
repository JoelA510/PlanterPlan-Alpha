import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskDetailsView from '@features/tasks/components/TaskDetailsView';

// Mock dependencies
vi.mock('@app/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user', subscription_status: 'active' },
        signOut: vi.fn(),
    }),
}));

vi.mock('@features/tasks/components/TaskResources', () => ({
    default: () => <div data-testid="task-resources">Task Resources</div>,
}));

vi.mock('@features/tasks/components/TaskDependencies', () => ({
    default: () => <div data-testid="task-dependencies">Task Dependencies</div>,
}));

vi.mock('@shared/lib/date-engine', () => ({
    formatDisplayDate: (date) => date ? `Formatted ${date}` : 'No Date',
}));

describe('TaskDetailsView', () => {
    it('renders placeholder when task is null', () => {
        render(<TaskDetailsView task={null} />);
        expect(screen.getByText('Select a task to view details')).toBeInTheDocument();
    });

    it('renders task details when task is provided', () => {
        const mockTask = {
            id: 'task-123',
            title: 'Test Task',
            description: 'Test Description',
            status: 'todo',
            due_date: '2023-01-01',
            created_at: '2023-01-01',
            origin: 'instance',
            is_premium: false,
        };

        render(<TaskDetailsView task={mockTask} />);

        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByTestId('task-resources')).toBeInTheDocument();
    });
});
