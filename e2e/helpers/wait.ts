import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Wait for the page to finish loading (network idle + no spinners) */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait for any loading spinners to disappear
  const spinner = page.locator('.animate-spin');
  if (await spinner.isVisible({ timeout: 500 }).catch(() => false)) {
    await expect(spinner).toBeHidden({ timeout: 15000 });
  }
}

/** Wait for navigation to a URL pattern */
export async function waitForNavigation(page: Page, urlPattern: string | RegExp) {
  await page.waitForURL(urlPattern, { timeout: 15000 });
  await waitForPageReady(page);
}

/** Poll until a condition is met (for eventually-consistent states) */
export async function pollUntil(
  page: Page,
  check: () => Promise<boolean>,
  options?: { timeout?: number; interval?: number }
) {
  const timeout = options?.timeout ?? 10000;
  const interval = options?.interval ?? 250;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await check()) return;
    await page.waitForTimeout(interval);
  }

  throw new Error(`pollUntil timed out after ${timeout}ms`);
}
