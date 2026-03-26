import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockMe = vi.fn();

vi.mock('@/shared/api/planterClient', () => ({
  planter: {
    auth: {
      me: (...args: unknown[]) => mockMe(...args),
    },
  },
}));

import { useUser } from '@/shared/hooks/useUser';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user profile with full_name from metadata', async () => {
    mockMe.mockResolvedValue({
      id: 'u1',
      email: 'alice@example.com',
      user_metadata: { full_name: 'Alice Smith', avatar_url: 'https://img.example.com/a.png' },
    });

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      id: 'u1',
      email: 'alice@example.com',
      full_name: 'Alice Smith',
      avatar_url: 'https://img.example.com/a.png',
    });
  });

  it('falls back to name field when full_name is missing', async () => {
    mockMe.mockResolvedValue({
      id: 'u2',
      email: 'bob@example.com',
      user_metadata: { name: 'Bob Jones' },
    });

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.full_name).toBe('Bob Jones');
  });

  it('returns null full_name when neither name field exists', async () => {
    mockMe.mockResolvedValue({
      id: 'u3',
      email: 'no-name@example.com',
      user_metadata: {},
    });

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.full_name).toBeNull();
    expect(result.current.data?.avatar_url).toBeNull();
  });

  it('returns null when me() returns null', async () => {
    mockMe.mockResolvedValue(null);

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it('defaults email to empty string when missing', async () => {
    mockMe.mockResolvedValue({
      id: 'u4',
      user_metadata: {},
    });

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.email).toBe('');
  });

  it('does not retry on failure', async () => {
    mockMe.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Should only be called once (no retry)
    expect(mockMe).toHaveBeenCalledTimes(1);
  });
});
