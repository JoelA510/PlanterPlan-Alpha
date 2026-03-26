import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---- Mocks ----
const mockProjectGet = vi.fn();
const mockTeamMemberFilter = vi.fn();
const mockTeamMemberList = vi.fn();
const mockTeamMemberCreate = vi.fn();
const mockTeamMemberDelete = vi.fn();

vi.mock('@/shared/api/planterClient', () => ({
  planter: {
    entities: {
      Project: { get: (...args: unknown[]) => mockProjectGet(...args) },
      TeamMember: {
        filter: (...args: unknown[]) => mockTeamMemberFilter(...args),
        list: (...args: unknown[]) => mockTeamMemberList(...args),
        create: (...args: unknown[]) => mockTeamMemberCreate(...args),
        delete: (...args: unknown[]) => mockTeamMemberDelete(...args),
      },
    },
  },
}));

vi.mock('@/shared/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'current-user-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useTeam } from '@/features/people/hooks/useTeam';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useTeam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectGet.mockResolvedValue({ id: 'p1', title: 'Test Project' });
    mockTeamMemberFilter.mockResolvedValue([
      { id: 'm1', project_id: 'p1', user_id: 'u1', role: 'editor' },
    ]);
    mockTeamMemberList.mockResolvedValue([
      { id: 'm1', project_id: 'p1', user_id: 'u1', role: 'editor' },
      { id: 'm2', project_id: 'p2', user_id: 'u2', role: 'viewer' },
    ]);
  });

  it('fetches team members filtered by projectId', async () => {
    const { result } = renderHook(() => useTeam('p1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockTeamMemberFilter).toHaveBeenCalledWith({ project_id: 'p1' });
    expect(result.current.teamMembers).toHaveLength(1);
  });

  it('fetches all team members when projectId is null', async () => {
    const { result } = renderHook(() => useTeam(null), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockTeamMemberList).toHaveBeenCalled();
    expect(result.current.teamMembers).toHaveLength(2);
  });

  it('fetches project data when projectId is provided', async () => {
    const { result } = renderHook(() => useTeam('p1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.project).toBeDefined();
    });
    expect(mockProjectGet).toHaveBeenCalledWith('p1');
  });

  it('does not fetch project when projectId is null', async () => {
    renderHook(() => useTeam(null), { wrapper: createWrapper() });

    await new Promise(r => setTimeout(r, 50));
    expect(mockProjectGet).not.toHaveBeenCalled();
  });

  it('deleteMember calls delete and invalidates queries', async () => {
    mockTeamMemberDelete.mockResolvedValue({});

    const { result } = renderHook(() => useTeam('p1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.mutations.deleteMember.mutate('m1');
    });

    await waitFor(() => {
      expect(mockTeamMemberDelete).toHaveBeenCalledWith('m1');
    });
  });

  it('addMember injects current user id', async () => {
    mockTeamMemberCreate.mockResolvedValue({ id: 'm3' });

    const { result } = renderHook(() => useTeam('p1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.mutations.addMember.mutate({
        project_id: 'p1',
        name: 'New Member',
        email: 'new@example.com',
        role: 'editor',
      });
    });

    await waitFor(() => {
      expect(mockTeamMemberCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'current-user-1',
          project_id: 'p1',
        }),
      );
    });
  });

  it('defaults teamMembers to empty array', () => {
    mockTeamMemberFilter.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTeam('p1'), { wrapper: createWrapper() });
    expect(result.current.teamMembers).toEqual([]);
  });
});
