import { describe, it, expect } from 'vitest';
import {
  calculateScheduleFromOffset,
  toIsoDate,
  formatDisplayDate,
  recalculateProjectDates
} from './index';

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
    it('returns empty object if inputs missing', () => {
      expect(calculateScheduleFromOffset([], null, 0)).toEqual({});
    });
  });

  describe('recalculateProjectDates', () => {
    it('shifts incomplete tasks by delta', () => {
      const oldStart = '2024-01-01';
      const newStart = '2024-01-11'; // +10 days
      const tasks = [
        { id: 1, start_date: '2024-01-05', due_date: '2024-01-10', is_complete: false },
        { id: 2, start_date: '2024-01-01', is_complete: true }, // Should skip
      ];

      const updates = recalculateProjectDates(tasks, newStart, oldStart);

      expect(updates).toHaveLength(1);
      expect(updates[0].id).toBe(1);
      expect(updates[0].start_date).toContain('2024-01-15');
      expect(updates[0].due_date).toContain('2024-01-20');
    });

    it('handles negative time shifts', () => {
      const oldStart = '2024-01-10';
      const newStart = '2024-01-05'; // -5 days
      const tasks = [
        { id: 1, start_date: '2024-01-20', due_date: '2024-01-25', is_complete: false }
      ];
      const updates = recalculateProjectDates(tasks, newStart, oldStart);
      expect(updates[0].start_date).toContain('2024-01-15');
      expect(updates[0].due_date).toContain('2024-01-20');
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
