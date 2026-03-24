import type { Page, Locator } from '@playwright/test';

export class PhaseCard {
  readonly page: Page;
  readonly cards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cards = page.locator('[data-testid="phase-card"]');
  }

  async clickPhase(index: number) {
    await this.cards.nth(index).click();
  }

  async getPhaseCount() {
    return this.cards.count();
  }

  async isLocked(index: number) {
    const card = this.cards.nth(index);
    return card.locator('.cursor-not-allowed, [data-locked="true"]').isVisible().catch(() => false);
  }

  async getProgress(index: number) {
    const card = this.cards.nth(index);
    return card.locator('[role="progressbar"]');
  }
}
