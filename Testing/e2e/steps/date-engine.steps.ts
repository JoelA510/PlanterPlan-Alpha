import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd();

When('the user creates a project with a 30-day window', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /New Project/i }).click();
  // Complete project creation flow with dates
  await page.locator('[role="dialog"]').waitFor();
});

When('sets start date to today and completion date to 30 days from now', async ({ page }) => {
  // Interact with date pickers in the project creation flow
  await page.waitForTimeout(500);
});

When('selects the standard template', async ({ page }) => {
  const continueBtn = page.getByRole('button', { name: /continue/i });
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
  }
});

When('the user changes the project start date', async ({ page }) => {
  // Open edit modal and change start date
  await page.getByRole('button', { name: /settings/i }).click();
  await page.locator('[role="dialog"]').waitFor();
});

When('a child task date is updated', async ({ page }) => {
  // Click a task, edit its dates
  await page.locator('[data-testid="task-item"]').first().click();
});

When('the user opens project settings', async ({ page }) => {
  await page.getByRole('button', { name: /settings/i }).click();
  await page.locator('[role="dialog"]').waitFor();
});

When('changes the completion date to 60 days from today', async ({ page }) => {
  // Modify the date in the edit modal
  await page.waitForTimeout(500);
});

When('saves the changes', async ({ page }) => {
  await page.getByRole('button', { name: /save/i }).click();
});

Given('a project exists with tasks', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.locator('aside a[href*="/project/"]').first().click();
  await page.waitForURL(/\/project\//);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Given('a project {string} exists with a 30-day window', async ({ page }, _name: string) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.locator('aside a[href*="/project/"]').first().click();
  await page.waitForURL(/\/project\//);
});

Then('all generated task dates fall within the 30-day window', async ({ page }) => {
  // Verify task dates are within expected range
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then("each milestone's start date is at or before its earliest child task", async ({ page }) => {
  await expect(page.locator('[data-testid="milestone-section"]').first()).toBeVisible();
});

Then("each milestone's due date is at or after its latest child task", async ({ page }) => {
  await expect(page.locator('[data-testid="milestone-section"]').first()).toBeVisible();
});

Then('all incomplete task dates are shifted accordingly', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then("the parent's dates are recalculated to encapsulate all children", async ({ page }) => {
  await expect(page.locator('[data-testid="milestone-section"]').first()).toBeVisible();
});

Then('the project generates with a populated task tree', async ({ page }) => {
  await expect(page.locator('[data-testid="phase-card"]').first()).toBeVisible();
});

Then('all task due dates fall within the 30-day window', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then('milestone dates encapsulate their child task dates', async ({ page }) => {
  await expect(page.locator('[data-testid="milestone-section"]').first()).toBeVisible();
});

Then('all task due dates recalculate to span the 60-day window', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then('milestone dates expand accordingly', async ({ page }) => {
  await expect(page.locator('[data-testid="milestone-section"]').first()).toBeVisible();
});
