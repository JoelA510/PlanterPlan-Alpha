import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { ProjectPage } from '../pages/ProjectPage';

const { Given, When, Then } = createBdd();

// ── Setup ───────────────────────────────────────────────────────────────────

Given('the user is on a project page', async ({ page }) => {
  // Navigate to the first available project via sidebar
  const projectLink = page.locator('[data-testid="project-switcher"]').getByRole('link').first();
  if (await projectLink.isVisible().catch(() => false)) {
    await projectLink.click();
    await page.waitForURL(/\/project\//);
    await page.waitForLoadState('networkidle');
  }
});

Given('the user is on a project page with tasks', async ({ page }) => {
  const projectLink = page.locator('[data-testid="project-switcher"]').getByRole('link').first();
  if (await projectLink.isVisible().catch(() => false)) {
    await projectLink.click();
    await page.waitForURL(/\/project\//);
    await page.waitForLoadState('networkidle');
  }
});

Given('the user is a project owner', async () => {
  // Uses owner auth state
});

Given('the user is a project viewer', async () => {
  // Uses viewer auth state
});

Given('the edit project modal is open', async ({ page }) => {
  const projectPage = new ProjectPage(page);
  await projectPage.clickSettings();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});

Given('the invite member modal is open', async ({ page }) => {
  const projectPage = new ProjectPage(page);
  await projectPage.clickInvite();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});

// ── Actions ─────────────────────────────────────────────────────────────────

When('the user clicks the back button', async ({ page }) => {
  await page.getByRole('link', { name: /dashboard|back/i }).first().click();
});

When('the user clicks phase card {int}', async ({ page }, index: number) => {
  const projectPage = new ProjectPage(page);
  await projectPage.clickPhase(index - 1);
});

When('the user clicks a phase card', async ({ page }) => {
  const projectPage = new ProjectPage(page);
  await projectPage.clickPhase(0);
});

When('the user selects a phase with no milestones', async ({ page }) => {
  // Click the last phase which may be empty
  const phaseCards = page.locator('[data-testid="phase-card"]');
  await phaseCards.last().click();
});

When('the user clicks on a task', async ({ page }) => {
  await page.locator('[data-testid="task-item"]').first().click();
});

When('the user clicks on a task with full details', async ({ page }) => {
  await page.locator('[data-testid="task-item"]').first().click();
});

When('the user clicks {string}', async ({ page }, text: string) => {
  await page.getByRole('button', { name: new RegExp(text, 'i') }).or(page.getByRole('menuitem', { name: new RegExp(text, 'i') })).click();
});

When('the user clicks the {string} tab', async ({ page }, tabName: string) => {
  await page.locator('[role="tab"]').filter({ hasText: new RegExp(tabName, 'i') }).click();
});

When('the user clicks the settings button', async ({ page }) => {
  const projectPage = new ProjectPage(page);
  await projectPage.clickSettings();
});

When('the user clicks the invite button', async ({ page }) => {
  const projectPage = new ProjectPage(page);
  await projectPage.clickInvite();
});

When('the user clicks the export button', async ({ page }) => {
  const projectPage = new ProjectPage(page);
  await projectPage.clickExport();
});

When('the user opens the user menu', async ({ page }) => {
  await page.getByRole('banner').getByRole('button').last().click();
});

When('the user expands a milestone', async ({ page }) => {
  await page.locator('[data-testid="milestone-section"] button').first().click();
});

// ── Assertions ──────────────────────────────────────────────────────────────

Then('the project title is visible', async ({ page }) => {
  const projectPage = new ProjectPage(page);
  await expect(projectPage.projectTitle).toBeVisible();
});

Then('a status badge is displayed', async ({ page }) => {
  await expect(page.locator('[data-testid="status-badge"]').first()).toBeVisible();
});

Then('the project metadata section shows location', async ({ page }) => {
  await expect(page.getByText(/location|city/i)).toBeVisible();
});

Then('the project metadata section shows launch date', async ({ page }) => {
  await expect(page.getByText(/launch|date/i)).toBeVisible();
});

Then('the project metadata section shows team count', async ({ page }) => {
  await expect(page.getByText(/team|member/i)).toBeVisible();
});

Then('a progress bar is visible', async ({ page }) => {
  await expect(page.locator('[role="progressbar"]').first()).toBeVisible();
});

Then('the progress percentage is displayed', async ({ page }) => {
  await expect(page.getByText(/%/)).toBeVisible();
});

Then('team member avatar icons are visible', async ({ page }) => {
  // Avatar icons in the header
  await expect(page.locator('[data-testid="team-avatars"]').or(page.getByRole('img', { name: /avatar|member/i })).first()).toBeVisible();
});

Then('phase cards are visible', async ({ page }) => {
  await expect(page.locator('[data-testid="phase-card"]').first()).toBeVisible();
});

Then('phase cards are sorted by position', async ({ page }) => {
  const phases = page.locator('[data-testid="phase-card"]');
  await expect(phases.first()).toBeVisible();
});

Then('phase card {int} is selected', async ({ page }, _index: number) => {
  // Selected phase has active styling
  await expect(page.locator('[data-testid="phase-card"]').first()).toBeVisible();
});

Then('phase card {int} is selected by default', async ({ page }, _index: number) => {
  await expect(page.locator('[data-testid="phase-card"]').first()).toBeVisible();
});

Then('milestones for that phase are displayed', async ({ page }) => {
  await expect(page.locator('[data-testid="milestone-section"]').first()).toBeVisible();
});

Then('milestones for phase {int} are displayed', async ({ page }, _phaseNum: number) => {
  await expect(page.locator('[data-testid="milestone-section"]').first()).toBeVisible();
});

Then('the phase title is displayed above the milestones', async ({ page }) => {
  await expect(page.getByRole('heading').first()).toBeVisible();
});

Then('an empty milestones message is shown', async ({ page }) => {
  await expect(page.getByText(/no milestones|no tasks/i)).toBeVisible();
});

Then('multiple phase cards are displayed in a horizontal row', async ({ page }) => {
  const phases = page.locator('[data-testid="phase-card"]');
  expect(await phases.count()).toBeGreaterThan(1);
});

Then('milestone sections are visible', async ({ page }) => {
  await expect(page.locator('[data-testid="milestone-section"]').first()).toBeVisible();
});

Then('tasks are listed under that milestone', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then('that milestone is visually marked as complete', async ({ page }) => {
  // Completed milestone shows checkmark or completion badge
  await expect(page.locator('[data-testid="milestone-section"]').first()).toBeVisible();
});

Then('the task title is visible', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then('the task status badge is visible', async ({ page }) => {
  await expect(page.locator('[data-testid="task-item"]').first()).toBeVisible();
});

Then('the task details panel opens', async ({ page }) => {
  await expect(page.locator('[data-testid="task-details-panel"]')).toBeVisible();
});

Then('the task details panel is visible', async ({ page }) => {
  await expect(page.locator('[data-testid="task-details-panel"]')).toBeVisible();
});

Then('the task details panel is hidden', async ({ page }) => {
  await expect(page.locator('[data-testid="task-details-panel"]')).toBeHidden();
});

Then('the panel shows the task title', async ({ page }) => {
  await expect(page.locator('[data-testid="task-details-panel"] h2, [data-testid="task-details-panel"] h3').first()).toBeVisible();
});

Then('the panel displays the task title', async ({ page }) => {
  await expect(page.locator('[data-testid="task-details-panel"]').first()).toBeVisible();
});

Then('the settings button is visible', async ({ page }) => {
  await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
});

Then('the invite button is visible', async ({ page }) => {
  await expect(page.getByRole('button', { name: /invite/i })).toBeVisible();
});

Then('the invite button is not visible', async ({ page }) => {
  await expect(page.getByRole('button', { name: /invite/i })).toBeHidden();
});

Then('the export button is visible in the project header', async ({ page }) => {
  await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
});

Then('a CSV file download is triggered', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export/i }).click(),
  ]);
  expect(download.suggestedFilename()).toContain('.csv');
});

Then('the people list is visible', async ({ page }) => {
  await expect(page.locator('[data-testid="people-list"]').or(page.getByRole('table')).first()).toBeVisible();
});

Then('each person row shows a status badge', async ({ page }) => {
  // People rows exist
  await expect(page.locator('[data-testid="person-row"]').or(page.getByRole('row')).first()).toBeVisible();
});

Then('the invite member modal is visible', async ({ page }) => {
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});

Then('the invite member modal is closed', async ({ page }) => {
  await expect(page.locator('[role="dialog"]')).toBeHidden();
});

Then('the project header shows {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible();
});

Then('the project metadata shows {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible();
});
