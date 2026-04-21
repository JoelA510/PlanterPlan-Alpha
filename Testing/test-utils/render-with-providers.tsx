import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/shared/i18n';
import { createTestQueryClient } from './query-wrapper';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  locale?: 'en' | 'es';
}

/**
 * Renders a React element wrapped in `QueryClientProvider` + `I18nextProvider`.
 * Every component test that mounts a tree using `useTranslation` must go through
 * this helper so `t()` resolves against the eager en.json resources.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderWithProvidersOptions,
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  if (options?.locale && i18n.language !== options.locale) {
    void i18n.changeLanguage(options.locale);
  }
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
  return { ...render(ui, { ...options, wrapper: Wrapper }), queryClient };
}
