// Mock must be before imports
import { calculateNewPosition } from './positionService';

jest.mock('../supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('positionService', () => {
  describe('calculateNewPosition', () => {
    it('calculates midpoint correctly for standard gap', () => {
      const prev = 10000;
      const next = 20000;
      const result = calculateNewPosition(prev, next);
      expect(result).toBe(15000);
    });

    it('handles insertion at start (prev=0)', () => {
      const prev = 0;
      const next = 10000;
      const result = calculateNewPosition(prev, next);
      expect(result).toBe(5000);
    });

    it('handles insertion at end (next=undefined/null)', () => {
      const prev = 30000;
      const result = calculateNewPosition(prev, null);
      // Logic: next is treated as prev + 2*STEP (30000 + 20000 = 50000)
      // Midpoint: (30000 + 50000) / 2 = 40000
      expect(result).toBe(40000);
    });

    it('returns null (trigger renormalize) on insufficient gap', () => {
      const prev = 10000;
      const next = 10001; // Gap is 1
      const result = calculateNewPosition(prev, next); // MIN_GAP is 2
      expect(result).toBeNull();
    });

    it('returns null on collision', () => {
      const prev = 10000;
      const next = 10000; // Same position (shouldn't happen if sorted unique, but robust check)
      const result = calculateNewPosition(prev, next);
      expect(result).toBeNull();
    });

    it('handles large inputs safely (BIGINT simulation)', () => {
      // JS numbers are safe up to 2^53. 10000 * 100 items = 1,000,000. Safe.
      const prev = 9007199254700000;
      const next = 9007199254720000; // gap 20000
      const result = calculateNewPosition(prev, next);
      expect(result).toBe(9007199254710000);
    });
  });
});
