import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TasksPage from './TasksPage';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@app/contexts/ToastContext';

// Mock dependencies
import { planter } from '@shared/api/planterClient';
import { useTaskMutations } from '@features/tasks/hooks/useTaskMutations';

vi.mock('@shared/api/planterClient', () => ({
  planter: {
    entities: {
      Task: {
        list: vi.fn(),
      },
    },
  },
}));

vi.mock('@features/tasks/hooks/useTaskMutations', () => ({
  useTaskMutations: vi.fn(),
}));

vi.mock('@layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

// Mock TaskList to expose delete functionality for testing
vi.mock('@features/tasks/components/TaskList', () => ({
  default: ({ tasks }) => (
    <div data-testid="task-list">
      {tasks.map((task) => (
        <div key={task.id} data-testid={`task-${task.id}`}>
          {task.title}
        </div>
      ))}
    </div>
  ),
}));

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTaskMutations.mockReturnValue({
      updateTask: vi.fn(),
    });
  });

  const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it('renders tasks when data is available', async () => {
    planter.entities.Task.list.mockResolvedValue([
      { id: '1', title: 'Test Task', parent_task_id: 'parent-1', origin: 'instance' },
      { id: '2', title: 'Another Task', parent_task_id: 'parent-2', origin: 'instance' },
    ]);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <ToastProvider>
            <TasksPage />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for data to load
    expect(await screen.findByText('My Tasks')).toBeInTheDocument();
    // Check specific tasks
    expect(await screen.findByText('Test Task')).toBeInTheDocument();
    expect(await screen.findByText('Another Task')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', async () => {
    planter.entities.Task.list.mockResolvedValue([]);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <ToastProvider>
            <TasksPage />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('No tasks found across your projects.')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    // Return a promise that never resolves immediately to test loading state
    planter.entities.Task.list.mockReturnValue(new Promise(() => { }));

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <ToastProvider>
            <TasksPage />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Should show loading spinner (Loader2 icon)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
