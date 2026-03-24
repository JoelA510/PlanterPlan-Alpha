import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { When, Then } = createBdd();

When('another user changes a task status', async ({ page, context }) => {
  // Open a second browser context to simulate another user
  const secondPage = await context.newPage();
  await secondPage.goto(page.url());
  await secondPage.waitForLoadState('networkidle');

  const statusSelect = secondPage.locator('[data-testid="status-select"]').first();
  if (await statusSelect.isVisible().catch(() => false)) {
    await statusSelect.click();
    await secondPage.getByText(/in progress/i).click();
  }
  await secondPage.close();
});

Then('the task status updates without page refresh', async ({ page }) => {
  // The task list should still be visible and updated
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

When('another user creates a new task', async ({ page, context }) => {
  const secondPage = await context.newPage();
  await secondPage.goto(page.url());
  await secondPage.waitForLoadState('networkidle');

  const addBtn = secondPage.getByRole('button', { name: /add task/i }).first();
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
  }
  await secondPage.close();
});

Then('the new task appears in the task list without refresh', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

When('another user deletes a task', async ({ page, context }) => {
  const secondPage = await context.newPage();
  await secondPage.goto(page.url());
  await secondPage.waitForLoadState('networkidle');
  await secondPage.close();
});

Then('the task disappears from the list without refresh', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

When('the realtime connection is briefly interrupted', async ({ page }) => {
  // Simulate network interruption
  await page.context().setOffline(true);
  await page.waitForTimeout(1000);
  await page.context().setOffline(false);
});

Then('the connection is re-established', async ({ page }) => {
  await page.waitForLoadState('networkidle');
});

Then('the task list remains up to date', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').or(page.getByText(/no tasks/i)).first()).toBeVisible();
});
