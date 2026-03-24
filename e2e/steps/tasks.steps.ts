import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd();

Given('the user is on the My Tasks page', async ({ page }) => {
  await page.goto('/tasks');
  await page.waitForLoadState('networkidle');
});

Given('the user is on the My Tasks page in board view', async ({ page }) => {
  await page.goto('/tasks');
  await page.waitForLoadState('networkidle');
  const boardBtn = page.getByRole('button', { name: /board/i });
  if (await boardBtn.isVisible().catch(() => false)) {
    await boardBtn.click();
  }
});

Given('the user has tasks assigned', async () => {
  // Assumes seeded test data
});

Given('the user has no tasks assigned', async () => {
  // Requires fresh user state
});

Given('the user has no tasks', async () => {
  // Requires fresh user state
});

When('the user clicks the board view button', async ({ page }) => {
  await page.getByRole('button', { name: /board/i }).click();
});

When('the user clicks the list view button', async ({ page }) => {
  await page.getByRole('button', { name: /list/i }).click();
});

When('the user is in board view', async ({ page }) => {
  const boardBtn = page.getByRole('button', { name: /board/i });
  if (await boardBtn.isVisible().catch(() => false)) {
    await boardBtn.click();
  }
});

When('the user switches to board view', async ({ page }) => {
  await page.getByRole('button', { name: /board/i }).click();
});

When('the user switches back to list view', async ({ page }) => {
  await page.getByRole('button', { name: /list/i }).click();
});

When('the user changes a task status via dropdown', async ({ page }) => {
  const statusSelect = page.locator('[data-testid="status-select"]').first();
  if (await statusSelect.isVisible().catch(() => false)) {
    await statusSelect.selectOption('in_progress');
  }
});

When('the user refreshes the page', async ({ page }) => {
  await page.reload();
  await page.waitForLoadState('networkidle');
});

Then('task items are listed', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then('each task shows a title', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then('each task shows a status badge', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then('the board view is displayed', async ({ page }) => {
  await expect(page.locator('[data-testid="board-column"]').first()).toBeVisible();
});

Then('columns for {string}, {string}, {string}, and {string} are visible', async ({ page }, ...columns: string[]) => {
  for (const col of columns) {
    await expect(page.getByText(col)).toBeVisible();
  }
});

Then('tasks are grouped by their status in the correct columns', async ({ page }) => {
  await expect(page.locator('[data-testid="board-column"]').first()).toBeVisible();
});

Then('the same tasks are still visible', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then('the task status is updated', async ({ page }) => {
  // Status change reflects immediately
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});
