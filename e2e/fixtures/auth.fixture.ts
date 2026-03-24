import { test as base } from 'playwright-bdd';
import { AUTH_STATES } from './test-data';

/** Extend base test with an authenticated browser context */
export const test = base.extend<{ authenticatedPage: ReturnType<typeof base['extend']> }>({
  storageState: async ({}, use) => {
    await use(AUTH_STATES.user);
  },
});

/** Create a test instance pre-authenticated as a specific role */
export function testAsRole(role: keyof typeof AUTH_STATES) {
  return base.extend({
    storageState: async ({}, use) => {
      await use(AUTH_STATES[role]);
    },
  });
}
