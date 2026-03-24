import type { Page, Locator } from '@playwright/test';

export class ReportsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly projectSelector: Locator;
  readonly statsCards: Locator;
  readonly overallProgress: Locator;
  readonly pieChart: Locator;
  readonly phaseDetails: Locator;
  readonly upcomingDeadlines: Locator;
  readonly backArrow: Locator;
  readonly spinner: Locator;
  readonly emptyPrompt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { level: 1 });
    this.projectSelector = page.locator('[data-testid="project-selector"]');
    this.statsCards = page.locator('[data-testid="stats-card"]');
    this.overallProgress = page.locator('[data-testid="overall-progress"]');
    this.pieChart = page.locator('[data-testid="pie-chart"]').or(page.locator('.recharts-pie'));
    this.phaseDetails = page.locator('[data-testid="phase-detail"]');
    this.upcomingDeadlines = page.locator('[data-testid="upcoming-deadlines"]');
    this.backArrow = page.getByRole('link', { name: /back/i });
    this.spinner = page.locator('[data-testid="loading-spinner"]').or(page.getByRole('progressbar'));
    this.emptyPrompt = page.getByText(/select a project/i);
  }

  async goto(projectId?: string) {
    const url = projectId ? `/reports?project=${projectId}` : '/reports';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async selectProject(projectName: string) {
    await this.projectSelector.click();
    await this.page.getByText(projectName).click();
  }

  async getStatsCards() {
    return this.statsCards;
  }

  async getOverallProgress() {
    return this.overallProgress;
  }

  async getPieChart() {
    return this.pieChart;
  }

  async getPhaseDetails() {
    return this.phaseDetails;
  }

  async getUpcomingDeadlines() {
    return this.upcomingDeadlines;
  }
}
