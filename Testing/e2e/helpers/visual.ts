import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Take a full-page screenshot and compare against baseline */
export async function assertScreenshot(page: Page, name: string, options?: { threshold?: number }) {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    maxDiffPixelRatio: options?.threshold ?? 0.002,
    animations: 'disabled',
  });
}

/** Take a screenshot of a specific element */
export async function assertElementScreenshot(
  page: Page,
  selector: string,
  name: string,
  options?: { threshold?: number }
) {
  const element = page.locator(selector);
  await expect(element).toHaveScreenshot(`${name}.png`, {
    maxDiffPixelRatio: options?.threshold ?? 0.002,
    animations: 'disabled',
  });
}
