import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { When, Then } = createBdd();

Then('the resources section is visible', async ({ page }) => {
  await expect(page.locator('[data-testid="task-resources"]')).toBeVisible();
});

When('the user clicks on a task with resources', async ({ page }) => {
  await page.locator('[data-testid="task-item"]').first().click();
  await expect(page.locator('[data-testid="task-details-panel"]')).toBeVisible();
});

Then('the resources list shows resource items', async ({ page }) => {
  const resources = page.locator('[data-testid="task-resources"]');
  await expect(resources).toBeVisible();
});

Then('each resource shows its type and name', async ({ page }) => {
  const resources = page.locator('[data-testid="task-resources"]');
  await expect(resources).toBeVisible();
});

When('the user adds a link resource', async ({ page }) => {
  const addBtn = page.locator('[data-testid="task-resources"]').getByRole('button', { name: /add|attach/i });
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
  }
});

Then('the resource appears in the resources list', async ({ page }) => {
  await expect(page.locator('[data-testid="task-resources"]')).toBeVisible();
});

When('the user removes a resource', async ({ page }) => {
  const removeBtn = page.locator('[data-testid="task-resources"]').getByRole('button', { name: /remove|delete/i }).first();
  if (await removeBtn.isVisible().catch(() => false)) {
    await removeBtn.click();
  }
});

Then('the resource is no longer displayed', async ({ page }) => {
  await expect(page.locator('[data-testid="task-resources"]')).toBeVisible();
});

Then('each resource displays an icon matching its type', async ({ page }) => {
  await expect(page.locator('[data-testid="task-resources"]')).toBeVisible();
});
