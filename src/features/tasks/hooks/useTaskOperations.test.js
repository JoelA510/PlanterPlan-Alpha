import { renderHook } from '@testing-library/react';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';

vi.mock('@app/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    })),
  },
}));

vi.mock('@features/tasks/services/taskService', () => ({
  fetchTaskChildren: vi.fn(),
  deepCloneTask: vi.fn(),
}));

vi.mock('@features/projects/services/projectService', () => ({
  getUserProjects: vi.fn().mockResolvedValue({ data: [], count: 0 }),
  getJoinedProjects: vi.fn().mockResolvedValue({ data: [] }),
}));

describe('@features/tasks/hooks/useTaskOperations', () => {
  it('renders without crashing', () => {
    const { result } = renderHook(() => useTaskOperations());
    expect(result.current).toBeDefined();
  });
});
