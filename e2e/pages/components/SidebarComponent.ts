import type { Page, Locator } from '@playwright/test';

export class SidebarComponent {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly myProjectsSection: Locator;
  readonly joinedProjectsSection: Locator;
  readonly templatesSection: Locator;
  readonly newProjectButton: Locator;
  readonly newTemplateButton: Locator;
  readonly loadMoreButton: Locator;
  readonly overlay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('aside');
    this.myProjectsSection = page.getByText(/my projects/i);
    this.joinedProjectsSection = page.getByText(/joined/i);
    this.templatesSection = page.getByText(/templates/i);
    this.newProjectButton = page.locator('aside').getByRole('button', { name: /new project/i });
    this.newTemplateButton = page.locator('aside').getByRole('button', { name: /new template/i });
    this.loadMoreButton = page.locator('aside').getByRole('button', { name: /load more|show more/i });
    this.overlay = page.locator('[data-testid="sidebar-overlay"]');
  }

  async clickProject(projectName: string) {
    await this.sidebar.getByText(projectName).click();
  }

  async clickNewProject() {
    await this.newProjectButton.click();
  }

  async clickNewTemplate() {
    await this.newTemplateButton.click();
  }

  async clickLoadMore() {
    await this.loadMoreButton.click();
  }

  async closeOnMobile() {
    await this.overlay.click();
  }
}
