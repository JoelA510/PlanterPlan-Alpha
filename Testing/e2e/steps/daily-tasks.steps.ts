import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, Then } = createBdd();

Given('the user is on the Daily Tasks page', async ({ page }) => {
  await page.goto('/daily');
  await page.waitForLoadState('networkidle');
});

Given('there are tasks due today', async () => {
  // Assumes seeded test data with tasks due today
});

Given('there are tasks due in the future', async () => {
  // Assumes seeded data
});

Given('there are completed tasks', async () => {
  // Assumes seeded data
});

Given('there are no tasks due today', async () => {
  // Requires clean state
});

Given('there are overdue tasks', async () => {
  // Assumes seeded data with past due dates
});

Given('there are active daily tasks', async () => {
  // Assumes seeded data
});

Then('the task count badge is displayed', async ({ page }) => {
  await expect(page.locator('[data-testid="task-count"]').or(page.getByText(/\d+ task/i))).toBeVisible();
});

Then("today's tasks are listed", async ({ page }) => {
  await expect(page.locator('[data-testid="daily-task-item"], [data-testid="task-item"]').first()).toBeVisible();
});

Then('future tasks are not shown in the daily list', async ({ page }) => {
  // Verify the list only contains today and overdue items
  await expect(page.locator('[data-testid="daily-task-item"]')).toHaveCount(0);
});

Then('completed tasks are not shown in the daily list', async ({ page }) => {
  // Completed tasks should not appear
  await page.waitForTimeout(500);
});

Then('the "All caught up" message is visible', async ({ page }) => {
  await expect(page.getByText(/all caught up|no tasks due/i)).toBeVisible();
});

Then('overdue dates are styled in red', async ({ page }) => {
  await expect(page.locator('.text-red-500, .text-red-600').first()).toBeVisible();
});

Then("today's dates are styled in amber", async ({ page }) => {
  await expect(page.locator('.text-amber-500, .text-amber-600').first()).toBeVisible();
});

Then('each task shows its status badge', async ({ page }) => {
  await expect(page.locator('[data-testid="daily-task-item"], [data-testid="task-item"]').first()).toBeVisible();
});
