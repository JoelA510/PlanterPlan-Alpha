import { describe, it, expect, vi } from 'vitest';
import { retry } from './retry';

describe('retry utility', () => {
    it('resolves immediately if the operation succeeds', async () => {
        const operation = vi.fn().mockResolvedValue('success');
        const result = await retry(operation);
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on failure up to maxRetries (if retryable)', async () => {
        const error = new Error('Transient failure');
        error.name = 'AbortError'; // Mark as retryable

        const operation = vi.fn()
            .mockRejectedValueOnce(error)
            .mockRejectedValueOnce(error)
            .mockResolvedValue('success');

        const result = await retry(operation, { retries: 3, minTimeout: 1 });
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
    });

    it('fails fast on non-retryable errors', async () => {
        const error = new Error('Logic error'); // Not AbortError
        const operation = vi.fn().mockRejectedValue(error);

        await expect(retry(operation, { retries: 3 }))
            .rejects.toThrow('Logic error');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('throws the last error if maxRetries is exceeded', async () => {
        const error = new Error('Persistent failure');
        error.name = 'AbortError'; // Retryable
        const operation = vi.fn().mockRejectedValue(error);

        await expect(retry(operation, { retries: 2, minTimeout: 1 }))
            .rejects.toThrow('Persistent failure');
        expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('retries specifically on AbortError even if usually fatal', async () => {
        const abortError = new Error('The user aborted a request.');
        abortError.name = 'AbortError';

        const operation = vi.fn()
            .mockRejectedValueOnce(abortError)
            .mockResolvedValue('success');

        const result = await retry(operation, { retries: 1, minTimeout: 1 });
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
    });
});
