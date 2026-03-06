import { describe, it, expect } from 'vitest';
import { calculateNewPosition } from './positionService';

describe('positionService - calculateNewPosition', () => {
  it('returns valid midpoint when gap is sufficient', () => {
    expect(calculateNewPosition(1000, 2000)).toBe(1500);
  });

  it('returns null when gap is less than MIN_GAP (2)', () => {
    expect(calculateNewPosition(1000, 1001)).toBeNull();
    expect(calculateNewPosition(1000, 1000)).toBeNull();
  });

  it('handles insertion at the end (nextPos is null or undefined)', () => {
    expect(calculateNewPosition(1000, null)).toBeGreaterThan(1000);
    expect(calculateNewPosition(1000, undefined)).toBeGreaterThan(1000);
  });

  it('handles insertion at the beginning (prevPos is null or undefined)', () => {
    // If prevPos is nullish, 'previous' is 0
    expect(calculateNewPosition(null, 1000)).toBe(500);
    expect(calculateNewPosition(undefined, 1000)).toBe(500);
  });

  it('handles empty list (both are null or undefined)', () => {
    // previous = 0, next = POSITION_STEP * 2
    expect(calculateNewPosition(null, null)).toBeGreaterThan(0);
  });
});
