import type { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heroHeading: Locator;
  readonly ctaButton: Locator;
  readonly featureCards: Locator;
  readonly navigation: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.getByRole('heading', { level: 1 });
    this.ctaButton = page.getByRole('link', { name: /get started|sign up|start/i }).first();
    this.featureCards = page.locator('[data-testid="feature-card"]').or(page.locator('section').filter({ hasText: /feature|plan|manage/i }));
    this.navigation = page.getByRole('navigation').or(page.getByRole('banner'));
    this.loginLink = page.getByRole('link', { name: /log in|sign in/i });
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }
}
