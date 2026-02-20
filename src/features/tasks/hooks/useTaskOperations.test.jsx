import { renderHook } from '@testing-library/react';
import { useTaskOperations } from '@/features/tasks/hooks/useTaskOperations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Mock supabaseClient
vi.mock('@/shared/db/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        }),
      }),
    }),
  },
}));

// Mock planter for useTaskMutations
vi.mock('@/shared/api/planterClient', () => ({
  planter: {
    entities: {
      Task: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    auth: {
      getUser: vi.fn(),
    }
  },
}));

// Mock dependencies
vi.mock('@/features/tasks/services/taskService', () => ({
  fetchTaskChildren: vi.fn(),
  deepCloneTask: vi.fn(),
  updateParentDates: vi.fn(),
}));

vi.mock('@/features/projects/services/projectService', () => ({
  getUserProjects: vi.fn().mockResolvedValue({ data: [], count: 0 }),
  getJoinedProjects: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/app/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({ user: { id: 'test-user', role: 'admin' } })
}));

import { planter } from '@/shared/api/planterClient';

describe('@/features/tasks/hooks/useTaskOperations', () => {
  it('renders without crashing', () => {
    const { result } = renderHook(() => useTaskOperations(), { wrapper });
    expect(result.current).toBeDefined();
  });

  it('exposes core CRUD operations', () => {
    const { result } = renderHook(() => useTaskOperations(), { wrapper });

    expect(result.current).toHaveProperty('createTaskOrUpdate');
    expect(result.current).toHaveProperty('updateTask');
    expect(result.current).toHaveProperty('deleteTask');
  });

  it('createTaskOrUpdate calls Task.create with correct default root_id', async () => {
    const { result } = renderHook(() => useTaskOperations(), { wrapper });

    // Mock planter response
    planter.entities.Task.create.mockResolvedValue({ data: { id: 'new-task' }, error: null });

    const formData = { title: 'New Task', days_from_start: 5 };
    const formState = { mode: 'create', parentId: null, origin: 'instance' };

    await result.current.createTaskOrUpdate(formData, formState);

    expect(planter.entities.Task.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Task',
      root_id: null,
      origin: 'instance',
      creator: 'test-user', // From mocked supabase auth
    }));
  });

  it('updateTask calls Task.update', async () => {
    const { result } = renderHook(() => useTaskOperations(), { wrapper });

    planter.entities.Task.update.mockResolvedValue({ data: { id: 't1' }, error: null });

    const updates = { title: 'Updated Title' };
    await result.current.updateTask('t1', updates);

    expect(planter.entities.Task.update).toHaveBeenCalledWith('t1', updates);
  });
});
