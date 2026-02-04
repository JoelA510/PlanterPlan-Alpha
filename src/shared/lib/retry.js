/**
 * Retries an async operation with exponential backoff.
 * 
 * @param {Function} operation - The async function to retry.
 * @param {Object} options - Configuration options.
 * @param {number} options.retries - Maximum number of retries (default: 3).
 * @param {number} options.minTimeout - Initial backoff delay in ms (default: 1000).
 * @param {number} options.factor - Exponential factor (default: 2).
 * @returns {Promise<any>} - The result of the operation.
 */
export async function retry(operation, options = {}) {
    const {
        retries = 3,
        minTimeout = 1000,
        factor = 2,
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Smart Retry Logic:
            // Only retry on network-like native errors or explicit 503s.
            // AbortError is critical for our timeout resilience lesson [NET-005].
            const isRetryable =
                error.name === 'AbortError' ||
                error.code === '20' || // Postgres Abort
                error.status === 503 ||
                error.message?.includes('Network request failed');

            if (!isRetryable) {
                throw error; // Fail fast on logic errors (400, 401, 404, etc)
            }

            if (attempt < retries) {
                const delay = minTimeout * Math.pow(factor, attempt);
                // console.warn(`[Retry] Attempt ${attempt + 1}/${retries} failed. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}
