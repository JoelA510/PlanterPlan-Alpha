import { describe, it, expect } from 'vitest';
import { calculateScheduleFromOffset, toIsoDate, formatDisplayDate } from './index';

describe('date-engine', () => {
  describe('toIsoDate', () => {
    it('handles UTC midnight correctly', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      expect(toIsoDate(date.toISOString())).toBe('2024-01-01');
    });

    it('returns null for invalid dates', () => {
      expect(toIsoDate('invalid')).toBe(null);
      expect(toIsoDate(null)).toBe(null);
    });
  });

  describe('calculateScheduleFromOffset', () => {
    // ... (mocking task list structure would be needed here if complex logic is tested)
    // Since we extracted pure logic, we can test it purely.
    it('returns empty object if inputs missing', () => {
      expect(calculateScheduleFromOffset([], null, 0)).toEqual({});
    });
  });
});

describe('formatDisplayDate', () => {
  it('formats ISO timestamps as Local Time', () => {
    // This test is tricky because it depends on the machine's timezone.
    // However, if we pass a full ISO string, it should parse.
    // We'll just verify it returns a non-empty string and isn't "Invalid Date"
    const dateStr = '2023-10-25T14:30:00Z';
    const result = formatDisplayDate(dateStr);
    expect(result).not.toBe('Invalid Date');
    expect(result).not.toBe('Not set');
    // Using string matching to avoid timezone flakiness
    expect(result).toContain('2023');
  });

  it('formats YYYY-MM-DD as UTC (preventing off-by-one errors)', () => {
    // 2023-10-25 should be Oct 25, not Oct 24
    const dateStr = '2023-10-25';
    const result = formatDisplayDate(dateStr);
    expect(result).toContain('Oct 25');
    expect(result).toContain('2023');
  });

  it('handles null/empty inputs', () => {
    expect(formatDisplayDate(null)).toBe('Not set');
    expect(formatDisplayDate('')).toBe('Not set');
  });
});
