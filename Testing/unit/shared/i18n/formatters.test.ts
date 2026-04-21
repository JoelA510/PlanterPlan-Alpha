import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { i18n } from '@/shared/i18n';
import {
  formatDateLocalized,
  formatNumberLocalized,
  formatCurrencyLocalized,
} from '@/shared/i18n/formatters';

describe('formatters', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  describe('formatDateLocalized', () => {
    it('returns empty string for null input', () => {
      expect(formatDateLocalized(null, 'short')).toBe('');
    });

    it('returns empty string for invalid ISO', () => {
      expect(formatDateLocalized('not-a-date', 'short')).toBe('');
    });

    it('produces locale-aware short date for en', () => {
      const out = formatDateLocalized('2026-03-15T12:00:00.000Z', 'short');
      expect(out).not.toBe('');
      // English short date includes a month abbreviation + year.
      expect(out).toMatch(/2026/);
    });

    it('produces locale-aware long date for en', () => {
      const out = formatDateLocalized('2026-03-15T12:00:00.000Z', 'long');
      // English full date includes the weekday.
      expect(out).toMatch(/Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday/);
    });

    it('produces distinct output for es vs en', async () => {
      const en = formatDateLocalized('2026-03-15T12:00:00.000Z', 'long');
      await i18n.changeLanguage('es');
      const es = formatDateLocalized('2026-03-15T12:00:00.000Z', 'long');
      expect(en).not.toBe(es);
    });

    it('formats relative dates via Intl.RelativeTimeFormat', () => {
      const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      const out = formatDateLocalized(tomorrow, 'relative');
      expect(out.length).toBeGreaterThan(0);
    });
  });

  describe('formatNumberLocalized', () => {
    it('honors locale grouping', async () => {
      const en = formatNumberLocalized(1234567.89);
      await i18n.changeLanguage('es');
      const es = formatNumberLocalized(1234567.89);
      expect(en).not.toBe(es);
    });

    it('accepts Intl.NumberFormatOptions', () => {
      expect(formatNumberLocalized(0.5, { style: 'percent' })).toMatch(/%/);
    });
  });

  describe('formatCurrencyLocalized', () => {
    it('defaults to USD symbol in en locale', () => {
      expect(formatCurrencyLocalized(10)).toMatch(/\$/);
    });

    it('renders locale-specific grouping for es', async () => {
      await i18n.changeLanguage('es');
      const es = formatCurrencyLocalized(1234.5, 'EUR');
      expect(es).toMatch(/€/);
    });
  });
});
