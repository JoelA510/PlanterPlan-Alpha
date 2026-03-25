import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retry } from './retry';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('retry', () => {
  it('returns on first successful call', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const promise = retry(op);
    const result = await promise;
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on AbortError and succeeds', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    const op = vi.fn()
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce('ok');

    const promise = retry(op, { retries: 2, minTimeout: 100 });
    // Advance past the first backoff delay
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('retries on status 503', async () => {
    const err503 = Object.assign(new Error('service unavailable'), { status: 503 });
    const op = vi.fn()
      .mockRejectedValueOnce(err503)
      .mockResolvedValueOnce('recovered');

    const promise = retry(op, { retries: 2, minTimeout: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toBe('recovered');
  });

  it('retries on Postgres abort code', async () => {
    const pgErr = Object.assign(new Error('pg abort'), { code: '20' });
    const op = vi.fn()
      .mockRejectedValueOnce(pgErr)
      .mockResolvedValueOnce('ok');

    const promise = retry(op, { retries: 2, minTimeout: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toBe('ok');
  });

  it('retries on network failure message', async () => {
    const netErr = new Error('Network request failed');
    const op = vi.fn()
      .mockRejectedValueOnce(netErr)
      .mockResolvedValueOnce('ok');

    const promise = retry(op, { retries: 2, minTimeout: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toBe('ok');
  });

  it('fails fast on 400 error (not retryable)', async () => {
    const err400 = Object.assign(new Error('bad request'), { status: 400 });
    const op = vi.fn().mockRejectedValue(err400);

    await expect(retry(op, { retries: 3 })).rejects.toThrow('bad request');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('fails fast on 401 error', async () => {
    const err401 = Object.assign(new Error('unauthorized'), { status: 401 });
    const op = vi.fn().mockRejectedValue(err401);

    await expect(retry(op, { retries: 3 })).rejects.toThrow('unauthorized');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('fails fast on 404 error', async () => {
    const err404 = Object.assign(new Error('not found'), { status: 404 });
    const op = vi.fn().mockRejectedValue(err404);

    await expect(retry(op, { retries: 3 })).rejects.toThrow('not found');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all retries', async () => {
    vi.useRealTimers();
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    const op = vi.fn().mockRejectedValue(abortErr);

    await expect(
      retry(op, { retries: 2, minTimeout: 1, factor: 1 }),
    ).rejects.toThrow('aborted');
    expect(op).toHaveBeenCalledTimes(3); // initial + 2 retries
    vi.useFakeTimers();
  });

  it('uses exponential backoff', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    const op = vi.fn()
      .mockRejectedValueOnce(abortErr)
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce('ok');

    const promise = retry(op, { retries: 3, minTimeout: 1000, factor: 2 });
    // First backoff: 1000 * 2^0 = 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    expect(op).toHaveBeenCalledTimes(2);
    // Second backoff: 1000 * 2^1 = 2000ms
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(3);
  });
});
