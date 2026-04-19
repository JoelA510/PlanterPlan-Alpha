import { vi } from 'vitest';

/**
 * Per-test helper: stubs the `gantt-task-react` module so unit tests never try to
 * render the full SVG library. Call inside a test file's top-level scope BEFORE
 * importing the code under test:
 *
 *   vi.mock('gantt-task-react', () => mockGanttLib());
 *
 * The returned `Gantt` is a `vi.fn` that captures its props (accessible via the
 * standard `.mock.calls` inspection). `ViewMode` is a string-valued object
 * sufficient for enum references inside consumer code.
 */
export function mockGanttLib() {
    return {
        Gantt: vi.fn(() => null),
        ViewMode: {
            Hour: 'Hour',
            QuarterDay: 'Quarter Day',
            HalfDay: 'Half Day',
            Day: 'Day',
            Week: 'Week',
            Month: 'Month',
            Year: 'Year',
        },
    };
}
