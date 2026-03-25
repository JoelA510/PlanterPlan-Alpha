import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useUpdateProjectStatus,
} from './useProjectMutations';
import { makeTask } from '@/test-utils';

// Mock planterClient
const mockProjectCreate = vi.fn();
const mockProjectUpdate = vi.fn();
const mockProjectDelete = vi.fn();
const mockTaskClone = vi.fn();
const mockTaskFilter = vi.fn();
const mockTaskUpsert = vi.fn();

vi.mock('@/shared/api/planterClient', () => ({
  planter: {
    entities: {
      Project: {
        create: (...args: unknown[]) => mockProjectCreate(...args),
        update: (...args: unknown[]) => mockProjectUpdate(...args),
        delete: (...args: unknown[]) => mockProjectDelete(...args),
      },
      Task: {
        clone: (...args: unknown[]) => mockTaskClone(...args),
        filter: (...args: unknown[]) => mockTaskFilter(...args),
        upsert: (...args: unknown[]) => mockTaskUpsert(...args),
      },
    },
  },
}));

// Mock supabase auth
vi.mock('@/shared/db/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      }),
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useCreateProject
// ---------------------------------------------------------------------------
describe('useCreateProject', () => {
  it('creates project without template', async () => {
    const project = makeTask({ id: 'new-proj', title: 'My Project' });
    mockProjectCreate.mockResolvedValueOnce(project);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateProject(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'My Project', start_date: '2026-01-01' });
    });

    expect(mockProjectCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My Project', creator: 'user-1' }),
    );
    expect(mockTaskClone).not.toHaveBeenCalled();
  });

  it('clones template when templateId provided', async () => {
    const cloned = makeTask({ id: 'cloned-proj' });
    mockTaskClone.mockResolvedValueOnce({ data: cloned, error: null });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateProject(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        title: 'From Template',
        templateId: 'tmpl-1',
        start_date: '2026-01-01',
      });
    });

    expect(mockTaskClone).toHaveBeenCalledWith(
      'tmpl-1',
      null,
      'instance',
      'user-1',
      expect.objectContaining({ title: 'From Template' }),
    );
    expect(mockProjectCreate).not.toHaveBeenCalled();
  });

  it('invalidates project query keys on success', async () => {
    mockProjectCreate.mockResolvedValueOnce(makeTask());
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateProject(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Test' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['projects'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['userProjects'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['allTasks'] }));
  });
});

// ---------------------------------------------------------------------------
// useUpdateProject
// ---------------------------------------------------------------------------
describe('useUpdateProject', () => {
  it('updates project without date cascading', async () => {
    mockProjectUpdate.mockResolvedValueOnce(makeTask());
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateProject(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        projectId: 'proj-1',
        updates: { title: 'Updated Title' },
      });
    });

    expect(mockProjectUpdate).toHaveBeenCalledWith('proj-1', expect.objectContaining({ title: 'Updated Title' }));
    expect(mockTaskFilter).not.toHaveBeenCalled();
  });

  it('cascades dates when start_date changes', async () => {
    const tasks = [
      makeTask({ id: 't1', start_date: '2026-01-10', due_date: '2026-01-20', is_complete: false }),
    ];
    mockTaskFilter.mockResolvedValueOnce(tasks);
    mockProjectUpdate.mockResolvedValueOnce(makeTask());
    mockTaskUpsert.mockResolvedValueOnce({ data: [], error: null });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateProject(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        projectId: 'proj-1',
        updates: { start_date: '2026-01-06' },
        oldStartDate: '2026-01-01',
      });
    });

    expect(mockTaskFilter).toHaveBeenCalledWith({ root_id: 'proj-1' });
    expect(mockTaskUpsert).toHaveBeenCalled();
  });

  it('invalidates project-specific query keys on success', async () => {
    mockProjectUpdate.mockResolvedValueOnce(makeTask());
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProject(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 'proj-1', updates: { title: 'X' } });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['project', 'proj-1'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['projectHierarchy', 'proj-1'] }));
  });
});

// ---------------------------------------------------------------------------
// useDeleteProject
// ---------------------------------------------------------------------------
describe('useDeleteProject', () => {
  it('calls Project.delete', async () => {
    mockProjectDelete.mockResolvedValueOnce(true);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteProject(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('proj-1');
    });

    expect(mockProjectDelete).toHaveBeenCalledWith('proj-1');
  });

  it('invalidates global project keys on success', async () => {
    mockProjectDelete.mockResolvedValueOnce(true);
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteProject(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('proj-1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['projects'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['allTasks'] }));
  });
});

// ---------------------------------------------------------------------------
// useUpdateProjectStatus
// ---------------------------------------------------------------------------
describe('useUpdateProjectStatus', () => {
  it('calls Project.update with status', async () => {
    mockProjectUpdate.mockResolvedValueOnce(makeTask({ status: 'launched' }));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateProjectStatus(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 'proj-1', status: 'launched' });
    });

    expect(mockProjectUpdate).toHaveBeenCalledWith('proj-1', { status: 'launched' });
  });

  it('invalidates project keys on success', async () => {
    mockProjectUpdate.mockResolvedValueOnce(makeTask());
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProjectStatus(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 'proj-1', status: 'in_progress' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['project', 'proj-1'] }));
  });
});
