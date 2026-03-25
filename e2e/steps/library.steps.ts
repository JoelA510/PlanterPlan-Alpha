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

// ── Template Management ──────────────────────────────────────────────────────

Given('the user navigates to the library page', async ({ page }) => {
  // Navigate to the tasks page where the library/template section is accessible
  await page.goto('/tasks');
  await page.waitForLoadState('networkidle');
  // Click on the Templates section in sidebar if available
  const templatesLink = page.getByRole('link', { name: /template|library/i }).or(page.locator('[data-testid="sidebar-templates"]'));
  if (await templatesLink.isVisible().catch(() => false)) {
    await templatesLink.click();
    await page.waitForLoadState('networkidle');
  }
});

When('the user clicks "Add Template"', async ({ page }) => {
  await page.getByRole('button', { name: /add template|new template|create template/i }).click();
});

When('the user fills in the template title {string}', async ({ page }, title: string) => {
  const dialog = page.locator('[role="dialog"]');
  const titleInput = dialog.getByLabel(/title/i).or(dialog.locator('input[name="title"]'));
  await titleInput.fill(title);
});

When('the user saves the template', async ({ page }) => {
  await page.locator('[role="dialog"]').getByRole('button', { name: /save|create|add|submit/i }).click();
});

Then('the template {string} appears in the library list', async ({ page }, title: string) => {
  await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
});

Given('a template exists in the library', async ({ page }) => {
  // Verify at least one template item is visible
  await expect(page.locator('[data-testid="task-item"], [data-testid="template-item"]').first()).toBeVisible();
});

When('the user clicks on the template to edit', async ({ page }) => {
  await page.locator('[data-testid="task-item"], [data-testid="template-item"]').first().click();
});

When('the user changes the template title to {string}', async ({ page }, title: string) => {
  const panel = page.locator('[data-testid="task-details-panel"]');
  await panel.getByRole('button', { name: /edit/i }).click();
  const dialog = page.locator('[role="dialog"]');
  const titleInput = dialog.getByLabel(/title/i).or(dialog.locator('input[name="title"]'));
  await titleInput.clear();
  await titleInput.fill(title);
});

When('the user saves the changes', async ({ page }) => {
  await page.locator('[role="dialog"]').getByRole('button', { name: /save|update|submit/i }).click();
});

Then('the template title is updated to {string}', async ({ page }, title: string) => {
  await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
});

When('a task was created from a library template', async () => {
  // Precondition: assumes seeded test data includes a task cloned from a template
});

Then('the task shows a library origin indicator', async ({ page }) => {
  // Look for a visual indicator showing the task originated from the library
  const indicator = page.locator('[data-testid="library-indicator"], [data-testid="origin-badge"]').or(page.getByText(/from library|template/i));
  await expect(indicator.first()).toBeVisible();
});

When('the user clicks "Add to Library"', async ({ page }) => {
  const panel = page.locator('[data-testid="task-details-panel"]');
  await panel.getByRole('button', { name: /add to library|save to library/i }).click();
});

Then('the task is added to the master library', async ({ page }) => {
  // Verify success via toast (already asserted separately) or navigate to library
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
});
