/**
 * Retry Operation Utility
 * Retries a function with exponential backoff if it fails with specific errors (AbortError).
 * 
 * @param {Function} fn - The async function to retry
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {number} delay - Initial delay in ms (default: 300)
 * @returns {Promise<any>} - The result of the function
 */
export const retryOperation = async (fn, retries = 3, delay = 300) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            // Retry specifically on AbortError (network timeout/flake) or 503s
            const isAbort = err.name === 'AbortError' || err.code === '20' || err.status === 503;
            if (!isAbort && i < retries - 1) {
                // For non-abort errors, we might NOT want to retry? 
                // Actually, original intent was likely: ONLY retry on Abort/Network, throw others.
                throw err;
            }
            if (i === retries - 1) throw err;

            console.warn(`Retrying operation (attempt ${i + 1}) due to AbortError/NetworkError...`);
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
};
