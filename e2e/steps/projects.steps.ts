import { test as base, expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

Given('I am logged in as a normal user', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Dashboard')).toBeVisible();
});

When('I navigate to the dashboard', async ({ page }) => {
  await page.goto('/dashboard');
});

When('I click the "New Project" button', async ({ page }) => {
  await page.click('button:has-text("New Project")');
});

When('I fill in the project title with {string}', async ({ page }, title: string) => {
  await page.fill('input[name="title"]', title);
});

When('I submit the project form', async ({ page }) => {
  await page.click('button:has-text("Create Project")');
});

Then('I should see the project {string} on the dashboard', async ({ page }, title: string) => {
  await expect(page.locator(`text=${title}`)).toBeVisible();
});

Then('the project status should be {string}', async ({ page }, status: string) => {
  await expect(page.locator(`text=${status}`)).toBeVisible();
});

Given('I have a project named {string}', async ({ page }, title: string) => {
  // Using fixture setup logic later; for now just assume it exists
  await expect(page.locator(`text=${title}`)).toBeVisible();
});

When('I open the project {string}', async ({ page }, title: string) => {
  await page.click(`text=${title}`);
});

When('I click "Add Task"', async ({ page }) => {
  await page.click('button:has-text("Add Task")');
});

When('I fill in the task title with {string}', async ({ page }, title: string) => {
  await page.fill('input[name="task_title"]', title);
});

When('I save the task', async ({ page }) => {
  await page.click('button:has-text("Save Task")');
});

Then('the task {string} should appear in the {string} column', async ({ page }, title: string, column: string) => {
  const columnLocator = page.locator(`[data-testid="column-${column}"]`);
  await expect(columnLocator.locator(`text=${title}`)).toBeVisible();
});

Given('I have a task named {string} in {string}', async ({ page }, title: string, column: string) => {
  const columnLocator = page.locator(`[data-testid="column-${column}"]`);
  await expect(columnLocator.locator(`text=${title}`)).toBeVisible();
});

When('I drag the task {string} to the {string} column', async ({ page }, title: string, destColumn: string) => {
  const sourceNode = page.locator(`text=${title}`);
  const destNode = page.locator(`[data-testid="column-${destColumn}"]`);
  await sourceNode.dragTo(destNode);
});

Then('the task status should be updated to {string}', async ({ page }, status: string) => {
  // Wait for the UI sync and network payload
  await page.waitForTimeout(500); 
  await expect(page.locator(`[data-testid="column-${status}"] >> text=Design Database Schema`)).toBeVisible();
});
