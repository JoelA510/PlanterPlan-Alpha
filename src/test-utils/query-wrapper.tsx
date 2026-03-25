import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';

/** Creates a fresh QueryClient configured for testing (no retries, no GC). */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Renders a React element wrapped in QueryClientProvider for hook testing. */
export function renderWithQueryClient(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient },
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...render(ui, { ...options, wrapper: Wrapper }), queryClient };
}
