import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProjectSelection } from './useProjectSelection';
import type { Task, Project } from '@/shared/db/app.types';

describe('useProjectSelection', () => {
  const instanceTasks = [{ id: 'p1', title: 'P1' }] as Task[];
  const templateTasks: Task[] = [];
  const joinedProjects: Project[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with null activeProjectId', () => {
    const { result } = renderHook(() => useProjectSelection({
      urlProjectId: null,
      instanceTasks,
      templateTasks,
      joinedProjects,
      loading: false
    }));

    expect(result.current.activeProjectId).toBeNull();
  });

  it('selects project', async () => {
    const { result } = renderHook(() => useProjectSelection({
      urlProjectId: null,
      instanceTasks,
      templateTasks,
      joinedProjects,
      loading: false
    }));

    await act(async () => {
      await result.current.handleSelectProject(instanceTasks[0]);
    });

    expect(result.current.activeProjectId).toBe('p1');
  });

  it('syncs from URL', async () => {
    const { result } = renderHook(() => useProjectSelection({
      urlProjectId: 'p1',
      instanceTasks,
      templateTasks,
      joinedProjects,
      loading: false
    }));

    // Expect sync to happen in effect
    await waitFor(() => {
      expect(result.current.activeProjectId).toBe('p1');
    });
  });
});
