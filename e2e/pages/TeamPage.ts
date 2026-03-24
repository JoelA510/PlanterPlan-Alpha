import type { Page, Locator } from '@playwright/test';

export class TeamPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly memberCards: Locator;
  readonly addMemberButton: Locator;
  readonly emptyState: Locator;
  readonly spinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { level: 1 });
    this.memberCards = page.locator('[data-testid="team-member-card"]');
    this.addMemberButton = page.getByRole('button', { name: /add member/i });
    this.emptyState = page.getByText(/no team members|build your team/i);
    this.spinner = page.locator('.animate-spin');
  }

  async goto(projectId?: string) {
    const url = projectId ? `/team?project=${projectId}` : '/team';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async getTeamMembers() {
    return this.memberCards;
  }

  async clickAddMember() {
    await this.addMemberButton.click();
  }

  async fillMemberName(name: string) {
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.getByLabel(/name/i).first().fill(name);
  }

  async fillMemberEmail(email: string) {
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.getByLabel(/email/i).fill(email);
  }

  async fillMemberRole(role: string) {
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.getByLabel(/role/i).selectOption(role);
  }

  async submitAddMember() {
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.getByRole('button', { name: /add/i }).click();
  }

  async removeMember(memberName: string) {
    const card = this.memberCards.filter({ hasText: memberName });
    await card.getByRole('button', { name: /more|menu/i }).click();
    await this.page.getByText(/remove/i).click();
  }
}
