import type { Page, Locator } from '@playwright/test';

export class HeaderComponent {
  readonly page: Page;
  readonly logo: Locator;
  readonly breadcrumb: Locator;
  readonly userAvatar: Locator;
  readonly userDropdown: Locator;
  readonly settingsLink: Locator;
  readonly logoutButton: Locator;
  readonly mobileMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.getByText('PlanterPlan').first();
    this.breadcrumb = page.locator('[data-testid="breadcrumb"]');
    this.userAvatar = page.locator('[data-testid="user-avatar"], header button').last();
    this.userDropdown = page.locator('[role="menu"]');
    this.settingsLink = page.getByRole('menuitem', { name: /settings/i });
    this.logoutButton = page.getByRole('menuitem', { name: /log out|sign out/i });
    this.mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
  }

  async openUserMenu() {
    await this.userAvatar.click();
  }

  async clickSettings() {
    await this.openUserMenu();
    await this.settingsLink.click();
  }

  async clickLogout() {
    await this.openUserMenu();
    await this.logoutButton.click();
  }

  async toggleMobileMenu() {
    await this.mobileMenuButton.click();
  }
}
