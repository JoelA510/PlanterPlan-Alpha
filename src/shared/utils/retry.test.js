import { describe, it, expect, vi } from 'vitest';
import { retryOperation } from './retry';

describe('retryOperation', () => {
    it('should return result immediately if successful', async () => {
        const fn = vi.fn().mockResolvedValue('success');
        const result = await retryOperation(fn);
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on AbortError', async () => {
        let attempts = 0;
        const fn = vi.fn().mockImplementation(async () => {
            attempts++;
            if (attempts < 3) throw { name: 'AbortError' };
            return 'success';
        });

        const result = await retryOperation(fn, 3, 10); // Short delay for test
        expect(fn).toHaveBeenCalledTimes(3);
        expect(result).toBe('success');
    });

    it('should retry on code 20 (Supabase Abort)', async () => {
        let attempts = 0;
        const fn = vi.fn().mockImplementation(async () => {
            attempts++;
            if (attempts < 2) throw { code: '20' };
            return 'recovered';
        });

        const result = await retryOperation(fn, 3, 10);
        expect(fn).toHaveBeenCalledTimes(2);
        expect(result).toBe('recovered');
    });

    it('should throw immediately on non-AbortError', async () => {
        const error = new Error('Critical Failure');
        const fn = vi.fn().mockRejectedValue(error);

        await expect(retryOperation(fn)).rejects.toThrow('Critical Failure');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exhausted', async () => {
        const fn = vi.fn().mockRejectedValue({ name: 'AbortError' });

        await expect(retryOperation(fn, 3, 10)).rejects.toEqual({ name: 'AbortError' });
        expect(fn).toHaveBeenCalledTimes(3);
    });
});
