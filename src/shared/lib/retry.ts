/** Configuration options for the retry utility. */
export interface RetryOptions {
 /** Maximum number of retries (default: 3). */
 retries?: number;
 /** Initial backoff delay in ms (default: 1000). */
 minTimeout?: number;
 /** Exponential factor (default: 2). */
 factor?: number;
}

/** Shape of errors that carry retryable metadata. */
interface RetryableError extends Error {
 code?: string;
 status?: number;
}

/**
 * Retries an async operation with exponential backoff.
 * Only retries on network-like errors (AbortError, 503, Postgres abort).
 * Fails fast on logic errors (400, 401, 404, etc).
 */
export async function retry<T>(
 operation: () => Promise<T>,
 options: RetryOptions = {},
): Promise<T> {
 const {
 retries = 3,
 minTimeout = 1000,
 factor = 2,
 } = options;

 let lastError: unknown;

 for (let attempt = 0; attempt <= retries; attempt++) {
 try {
 return await operation();
 } catch (error) {
 lastError = error;

 // Smart Retry Logic:
 // Only retry on network-like native errors or explicit 503s.
 // AbortError is critical for our timeout resilience lesson [NET-005].
 const err = error as RetryableError;
 const isRetryable =
 err.name === 'AbortError' ||
 err.code === '20' || // Postgres Abort
 err.status === 503 ||
 err.message?.includes('Network request failed');

 if (!isRetryable) {
 throw error; // Fail fast on logic errors (400, 401, 404, etc)
 }

 if (attempt < retries) {
 const delay = minTimeout * Math.pow(factor, attempt);
 await new Promise(resolve => setTimeout(resolve, delay));
 }
 }
 }

 throw lastError;
}
