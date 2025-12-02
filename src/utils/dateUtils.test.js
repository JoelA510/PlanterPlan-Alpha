import { calculateScheduleFromOffset, toIsoDate } from './dateUtils';

describe('calculateScheduleFromOffset', () => {
  const baseDate = '2025-01-01';
  const projectTask = {
    id: 'project-1',
    origin: 'instance',
    parent_task_id: null,
    start_date: baseDate,
    due_date: baseDate,
  };

  it('returns start and due dates offset from project start', () => {
    const tasks = [projectTask];

    const schedule = calculateScheduleFromOffset(tasks, 'project-1', 5);

    expect(schedule).toEqual({
      start_date: '2025-01-06T00:00:00.000Z',
      due_date: '2025-01-06T00:00:00.000Z',
    });
  });

  it('returns empty object when no parent task found', () => {
    const schedule = calculateScheduleFromOffset([], 'missing', 3);
    expect(schedule).toEqual({});
  });

  it('walks up the ancestor chain to find project start', () => {
    const tasks = [
      projectTask,
      {
        id: 'phase-1',
        origin: 'instance',
        parent_task_id: 'project-1',
        start_date: null,
        due_date: null,
      },
    ];

    const schedule = calculateScheduleFromOffset(tasks, 'phase-1', 2);

    expect(schedule).toEqual({
      start_date: '2025-01-03T00:00:00.000Z',
      due_date: '2025-01-03T00:00:00.000Z',
    });
  });

  it('returns empty object when offset is null', () => {
    const schedule = calculateScheduleFromOffset([projectTask], 'project-1', null);
    expect(schedule).toEqual({});
  });
});

describe('toIsoDate', () => {
  it('converts yyyy-mm-dd to UTC midnight ISO', () => {
    expect(toIsoDate('2025-02-01')).toBe('2025-02-01T00:00:00.000Z');
  });

  it('returns null for empty values', () => {
    expect(toIsoDate('')).toBeNull();
    expect(toIsoDate(null)).toBeNull();
  });

  it('passes through ISO strings unchanged', () => {
    const value = '2025-03-10T00:00:00.000Z';
    expect(toIsoDate(value)).toBe(value);
  });

  it('returns null for invalid inputs', () => {
    expect(toIsoDate('invalid')).toBeNull();
  });
});
