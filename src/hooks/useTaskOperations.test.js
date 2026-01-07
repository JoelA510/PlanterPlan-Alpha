import { renderHook } from '@testing-library/react';
import { useTaskOperations } from './useTaskOperations';

vi.mock('../supabaseClient', () => ({
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

vi.mock('../services/taskService', () => ({
  fetchTaskChildren: vi.fn(),
  deepCloneTask: vi.fn(),
}));

vi.mock('../services/projectService', () => ({
  getUserProjects: vi.fn().mockResolvedValue({ data: [], count: 0 }),
  getJoinedProjects: vi.fn().mockResolvedValue({ data: [] }),
}));

describe('useTaskOperations', () => {
  it('renders without crashing', () => {
    const { result } = renderHook(() => useTaskOperations());
    expect(result.current).toBeDefined();
  });
});
