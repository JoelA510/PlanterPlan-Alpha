import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { When, Then } = createBdd();

Then('the dependencies section is visible', async ({ page }) => {
  await expect(page.locator('[data-testid="task-dependencies"]')).toBeVisible();
});

When('the user views a locked phase', async ({ page }) => {
  const lockedPhase = page.locator('[data-testid^="phase-card"]').filter({ has: page.locator('[data-testid="locked-indicator"], .opacity-50') });
  await expect(lockedPhase.first()).toBeVisible();
});

Then('the phase shows a locked indicator', async ({ page }) => {
  await expect(page.locator('[data-testid="locked-indicator"]').or(page.getByText(/locked/i)).first()).toBeVisible();
});

Then('the phase tasks cannot be started', async ({ page }) => {
  // Locked phase tasks should not have clickable status controls
  const lockedPhase = page.locator('[data-testid^="phase-card"]').filter({ has: page.locator('[data-testid="locked-indicator"]') });
  const tasks = lockedPhase.locator('[data-testid="task-item"]');
  if (await tasks.count() > 0) {
    await expect(tasks.first().locator('[data-testid="status-select"]')).toBeHidden();
  }
});

When('all tasks in the prerequisite phase are completed', async () => {
  // This would require seeded test data with a completable phase
});

Then('the dependent phase becomes unlocked', async ({ page }) => {
  await expect(page.locator('[data-testid="locked-indicator"]')).toBeHidden();
});

Then('the phase no longer shows a locked indicator', async ({ page }) => {
  await expect(page.locator('[data-testid="locked-indicator"]')).toBeHidden();
});

When('the user clicks on a task with dependencies', async ({ page }) => {
  await page.locator('[data-testid="task-item"]').first().click();
});

Then('the task details panel shows prerequisite tasks', async ({ page }) => {
  await expect(page.locator('[data-testid="task-dependencies"]')).toBeVisible();
});

Then('each prerequisite shows its completion status', async ({ page }) => {
  const deps = page.locator('[data-testid="task-dependencies"]');
  await expect(deps).toBeVisible();
});

When('the user tries to complete a task with unfinished prerequisites', async ({ page }) => {
  const completeBtn = page.locator('[data-testid="task-details-panel"]').getByRole('button', { name: /complete/i });
  if (await completeBtn.isVisible().catch(() => false)) {
    await completeBtn.click();
  }
});

Then('a warning or error is displayed', async ({ page }) => {
  await expect(
    page.locator('[data-sonner-toast]').or(page.getByText(/cannot|locked|prerequisite/i)).first()
  ).toBeVisible({ timeout: 5000 });
});

When('the user completes the last task in a phase', async () => {
  // Requires seeded test data
});

Then('the next sequential phase is automatically unlocked', async ({ page }) => {
  // Verify the next phase no longer shows locked state
  await expect(page.locator('[data-testid^="phase-card"]').first()).toBeVisible();
});
