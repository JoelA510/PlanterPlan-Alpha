import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TasksPage from './TasksPage';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('@features/tasks/hooks/useTaskOperations');
vi.mock('@layouts/DashboardLayout', () => ({
    default: ({ children }) => <div>{children}</div>
}));
vi.mock('@features/navigation/components/SideNav', () => ({
    default: () => <div>SideNav</div>
}));
vi.mock('@features/tasks/components/TaskItem', () => ({
    default: ({ task, onDelete }) => (
        <div>
            {task.title}
            <button onClick={() => onDelete(task.id)}>Delete</button>
        </div>
    )
}));
vi.mock('@features/tasks/components/EditTaskForm', () => ({
    default: () => <div>EditTaskForm</div>
}));

vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children, open }) => open ? <div role="dialog">{children}</div> : null,
    AlertDialogContent: ({ children }) => <div>{children}</div>,
    AlertDialogHeader: ({ children }) => <div>{children}</div>,
    AlertDialogFooter: ({ children }) => <div>{children}</div>,
    AlertDialogTitle: ({ children }) => <div>{children}</div>,
    AlertDialogDescription: ({ children }) => <div>{children}</div>,
    AlertDialogAction: ({ children, onClick }) => <button onClick={onClick}>Confirm Delete</button>,
    AlertDialogCancel: ({ children }) => <button>{children}</button>,
}));

describe('TasksPage', () => {
    const mockDeleteTask = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useTaskOperations.mockReturnValue({
            tasks: [{ id: '1', title: 'Test Task', parent_task_id: 'root', origin: 'instance' }],
            instanceTasks: [],
            templateTasks: [],
            loading: false,
            error: null,
            joinedProjects: [],
            loadMoreProjects: vi.fn(),
            updateTask: vi.fn(),
            deleteTask: mockDeleteTask
        });
    });

    it('opens AlertDialog and deletes when confirmed', () => {
        render(
            <BrowserRouter>
                <TasksPage />
            </BrowserRouter>
        );

        // Click Delete on TaskItem
        const deleteBtn = screen.getByText('Delete');
        fireEvent.click(deleteBtn);

        // Verify Dialog is open
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Delete Task?')).toBeInTheDocument();

        // Click Confirm Delete in Dialog
        const confirmBtn = screen.getByText('Confirm Delete');
        fireEvent.click(confirmBtn);

        expect(mockDeleteTask).toHaveBeenCalledWith('1');
    });
});
