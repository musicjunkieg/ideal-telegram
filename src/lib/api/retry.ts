/**
 * Retry utilities for API calls with exponential backoff
 */

/**
 * Check if an error is retryable (network errors, rate limits, server errors)
 */
export function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		// Network errors
		if (error.name === 'TypeError' && error.message.includes('fetch')) {
			return true;
		}
	}

	// Check for HTTP response errors
	if (typeof error === 'object' && error !== null && 'status' in error) {
		const status = (error as { status: number }).status;
		// Retry on rate limit (429) or server errors (5xx)
		return status === 429 || (status >= 500 && status < 600);
	}

	return false;
}

/**
 * Delay execution for a specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds, doubles on each retry (default: 100)
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries = 3,
	baseDelayMs = 100
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry if error is not retryable or we've exhausted retries
			if (!isRetryableError(error) || attempt === maxRetries) {
				throw error;
			}

			// Exponential backoff: 100ms, 200ms, 400ms, 800ms...
			const delayMs = baseDelayMs * Math.pow(2, attempt);
			await delay(delayMs);
		}
	}

	// This should never be reached, but TypeScript needs it
	throw lastError;
}
