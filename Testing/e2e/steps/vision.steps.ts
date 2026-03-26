import { createBdd } from 'playwright-bdd';
import { assertVision, assertVisionChecks } from '../helpers/vision';
import { VISION_CHECKS } from '../helpers/vision-prompts';

const { Then } = createBdd();

// ── Dashboard Vision Checks ────────────────────────────────────────────────

Then('the dashboard looks correct visually', async ({ page }) => {
  await assertVisionChecks(page, {
    projectCards: VISION_CHECKS.dashboard.hasProjectCards,
    pipelineBoard: VISION_CHECKS.dashboard.hasPipelineBoard,
    statsOverview: VISION_CHECKS.dashboard.hasStatsOverview,
  });
});

Then('the dashboard stats are visually present', async ({ page }) => {
  await assertVision(page, VISION_CHECKS.dashboard.hasStatsOverview);
});

Then('the pipeline board is visually present', async ({ page }) => {
  await assertVision(page, VISION_CHECKS.dashboard.hasPipelineBoard);
});

// ── Project Vision Checks ──────────────────────────────────────────────────

Then('the project page displays all expected sections', async ({ page }) => {
  await assertVisionChecks(page, {
    header: VISION_CHECKS.project.hasProjectHeader,
    phases: VISION_CHECKS.project.hasPhaseCards,
    progress: VISION_CHECKS.project.hasProgressIndicator,
  });
});

Then('the project task list is visually present', async ({ page }) => {
  await assertVision(page, VISION_CHECKS.project.hasTaskList);
});

Then('the project board view is visually present', async ({ page }) => {
  await assertVision(page, VISION_CHECKS.project.hasBoardView);
});

Then('milestones are visually present', async ({ page }) => {
  await assertVision(page, VISION_CHECKS.project.hasMilestones);
});

// ── Task Details Vision Checks ─────────────────────────────────────────────

Then('the task details panel shows complete information', async ({ page }) => {
  await assertVisionChecks(page, {
    panel: VISION_CHECKS.taskDetails.hasPanelOpen,
    title: VISION_CHECKS.taskDetails.hasTaskTitle,
    status: VISION_CHECKS.taskDetails.hasStatusIndicator,
    actions: VISION_CHECKS.taskDetails.hasActionButtons,
  });
});

// ── My Tasks Vision Checks ─────────────────────────────────────────────────

Then('the My Tasks page looks correct visually', async ({ page }) => {
  await assertVisionChecks(page, {
    tasks: VISION_CHECKS.myTasks.hasTaskList,
    viewToggle: VISION_CHECKS.myTasks.hasViewToggle,
  });
});

// ── Reports Vision Checks ──────────────────────────────────────────────────

Then('the reports page displays charts and stats', async ({ page }) => {
  await assertVisionChecks(page, {
    selector: VISION_CHECKS.reports.hasProjectSelector,
    charts: VISION_CHECKS.reports.hasCharts,
    stats: VISION_CHECKS.reports.hasStatsCards,
  });
});

// ── Settings Vision Checks ─────────────────────────────────────────────────

Then('the settings page shows profile form', async ({ page }) => {
  await assertVisionChecks(page, {
    form: VISION_CHECKS.settings.hasProfileForm,
    save: VISION_CHECKS.settings.hasSaveButton,
  });
});

// ── Navigation Vision Checks ───────────────────────────────────────────────

Then('the navigation layout is visually correct', async ({ page }) => {
  await assertVisionChecks(page, {
    sidebar: VISION_CHECKS.navigation.hasSidebar,
    header: VISION_CHECKS.navigation.hasHeader,
    breadcrumb: VISION_CHECKS.navigation.hasBreadcrumb,
  });
});

// ── Home Page Vision Checks ────────────────────────────────────────────────

Then('the landing page looks correct visually', async ({ page }) => {
  await assertVisionChecks(page, {
    hero: VISION_CHECKS.home.hasHeroSection,
    features: VISION_CHECKS.home.hasFeatureCards,
    cta: VISION_CHECKS.home.hasSignUpCTA,
  });
});

// ── Mobile Vision Checks ───────────────────────────────────────────────────

Then('the mobile layout is visually correct', async ({ page }) => {
  await assertVisionChecks(page, {
    mobileLayout: VISION_CHECKS.mobile.hasMobileLayout,
    mobileMenu: VISION_CHECKS.mobile.hasMobileMenu,
  });
});

// ── Onboarding Vision Checks ───────────────────────────────────────────────

Then('the onboarding wizard is visually correct', async ({ page }) => {
  await assertVisionChecks(page, {
    wizard: VISION_CHECKS.onboarding.hasWizardDialog,
    steps: VISION_CHECKS.onboarding.hasStepIndicator,
  });
});

// ── Generic Vision Assertion ───────────────────────────────────────────────

Then('the page visually shows {string}', async ({ page }, description: string) => {
  await assertVision(page, `Is the following visible on this page: ${description}?`);
});

Then('the page does not visually show {string}', async ({ page }, description: string) => {
  const result = await assertVision(page, `Is the following visible on this page: ${description}?`).catch(() => null);
  if (result !== null) {
    throw new Error(`Expected "${description}" to NOT be visually present, but it was.`);
  }
});
