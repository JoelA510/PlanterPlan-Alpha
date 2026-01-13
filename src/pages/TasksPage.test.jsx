import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TasksPage from './TasksPage';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@app/contexts/ToastContext';

// Mock dependencies
vi.mock('@features/tasks/hooks/useTaskOperations');
vi.mock('@layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

// Mock TaskList to expose delete functionality for testing
vi.mock('@features/tasks/components/TaskList', () => ({
  default: ({ tasks, onUpdateTask }) => (
    <div data-testid="task-list">
      {tasks.map((task) => (
        <div key={task.id} data-testid={`task-${task.id}`}>
          {task.title}
          <button data-testid={`delete-${task.id}`}>Delete</button>
        </div>
      ))}
    </div>
  ),
}));

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tasks when data is available', () => {
    useTaskOperations.mockReturnValue({
      tasks: [
        { id: '1', title: 'Test Task', parent_task_id: 'parent-1', origin: 'instance' },
        { id: '2', title: 'Another Task', parent_task_id: 'parent-2', origin: 'instance' },
      ],
      loading: false,
      updateTask: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <TasksPage />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('My Tasks')).toBeInTheDocument();
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Another Task')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    useTaskOperations.mockReturnValue({
      tasks: [],
      loading: false,
      updateTask: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <TasksPage />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('No tasks found across your projects.')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    useTaskOperations.mockReturnValue({
      tasks: [],
      loading: true,
      updateTask: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <TasksPage />
        </ToastProvider>
      </BrowserRouter>
    );

    // Should show loading spinner (Loader2 icon)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
