import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { SELECTORS } from '../fixtures/test-data';

/** Assert a toast notification is visible with specific text */
export async function expectToast(page: Page, text: string) {
  const toast = page.locator(SELECTORS.toast).filter({ hasText: text });
  await expect(toast).toBeVisible({ timeout: 5000 });
}

/** Assert a success toast is visible */
export async function expectSuccessToast(page: Page, text?: string) {
  const toast = text
    ? page.locator(SELECTORS.toast).filter({ hasText: text })
    : page.locator(SELECTORS.toast).first();
  await expect(toast).toBeVisible({ timeout: 5000 });
}

/** Assert an error toast is visible */
export async function expectErrorToast(page: Page, text?: string) {
  const toast = text
    ? page.locator(SELECTORS.toast).filter({ hasText: text })
    : page.locator(SELECTORS.toast).first();
  await expect(toast).toBeVisible({ timeout: 5000 });
}

/** Wait for all toasts to disappear */
export async function waitForToastDismiss(page: Page) {
  await expect(page.locator(SELECTORS.toast)).toHaveCount(0, { timeout: 10000 });
}
