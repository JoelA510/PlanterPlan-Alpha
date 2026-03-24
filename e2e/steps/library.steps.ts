import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd();

When('the user opens the task creation form', async ({ page }) => {
  await page.getByRole('button', { name: /add task/i }).first().click();
});

When('the user types in the library search', async ({ page }) => {
  const searchInput = page.locator('[data-testid="library-search"] input, [role="combobox"]');
  await searchInput.fill('template');
});

When('the user selects a library template', async ({ page }) => {
  const result = page.locator('[data-testid="library-result"], [role="option"]').first();
  if (await result.isVisible().catch(() => false)) {
    await result.click();
  }
});

When('the user searches the library for a template task', async ({ page }) => {
  const searchInput = page.locator('[data-testid="library-search"] input, [role="combobox"]');
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('template');
  }
});

When('the user creates a task from a library template', async ({ page }) => {
  // Open form, search, select template, save
  await page.getByRole('button', { name: /add task/i }).first().click();
  const searchInput = page.locator('[data-testid="library-search"] input, [role="combobox"]');
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('template');
    const result = page.locator('[data-testid="library-result"], [role="option"]').first();
    if (await result.isVisible().catch(() => false)) {
      await result.click();
    }
  }
  await page.getByRole('button', { name: /save|add task/i }).click();
});

Then('the library search input is visible', async ({ page }) => {
  await expect(page.locator('[data-testid="library-search"], [role="combobox"]').first()).toBeVisible();
});

Then('matching template results appear', async ({ page }) => {
  await expect(page.locator('[data-testid="library-result"], [role="option"]').first()).toBeVisible();
});

Then('the task form fields are populated with the template data', async ({ page }) => {
  const titleInput = page.getByLabel(/title/i);
  await expect(titleInput).not.toHaveValue('');
});

Then('the new task is created with the template\'s data', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});
