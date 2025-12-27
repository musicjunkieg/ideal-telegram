import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isRetryableError, withRetry } from './retry';

describe('isRetryableError', () => {
	it('returns true for HTTP 429 (rate limit)', () => {
		const error = { status: 429 };
		expect(isRetryableError(error)).toBe(true);
	});

	it('returns true for HTTP 500 (server error)', () => {
		const error = { status: 500 };
		expect(isRetryableError(error)).toBe(true);
	});

	it('returns true for HTTP 502 (bad gateway)', () => {
		const error = { status: 502 };
		expect(isRetryableError(error)).toBe(true);
	});

	it('returns true for HTTP 503 (service unavailable)', () => {
		const error = { status: 503 };
		expect(isRetryableError(error)).toBe(true);
	});

	it('returns false for HTTP 400 (client error)', () => {
		const error = { status: 400 };
		expect(isRetryableError(error)).toBe(false);
	});

	it('returns false for HTTP 401 (unauthorized)', () => {
		const error = { status: 401 };
		expect(isRetryableError(error)).toBe(false);
	});

	it('returns false for HTTP 404 (not found)', () => {
		const error = { status: 404 };
		expect(isRetryableError(error)).toBe(false);
	});

	it('returns true for fetch TypeError', () => {
		const error = new TypeError('fetch failed');
		expect(isRetryableError(error)).toBe(true);
	});

	it('returns false for generic Error', () => {
		const error = new Error('Something went wrong');
		expect(isRetryableError(error)).toBe(false);
	});

	it('returns false for null', () => {
		expect(isRetryableError(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isRetryableError(undefined)).toBe(false);
	});
});

describe('withRetry', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns result on first success', async () => {
		const fn = vi.fn().mockResolvedValue('success');

		const result = await withRetry(fn);

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('retries on retryable error and succeeds', async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce({ status: 429 })
			.mockRejectedValueOnce({ status: 500 })
			.mockResolvedValue('success');

		const promise = withRetry(fn);

		// Advance through retry delays
		await vi.advanceTimersByTimeAsync(100); // First retry delay
		await vi.advanceTimersByTimeAsync(200); // Second retry delay

		const result = await promise;

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('throws after max retries exhausted', async () => {
		const error = { status: 500, message: 'Server error' };
		const fn = vi.fn().mockRejectedValue(error);

		let caughtError: unknown;
		const promise = withRetry(fn, 3).catch((e) => {
			caughtError = e;
		});

		// Run all timers to completion
		await vi.runAllTimersAsync();
		await promise;

		expect(caughtError).toEqual(error);
		expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
	});

	it('throws immediately on non-retryable error', async () => {
		const error = { status: 404, message: 'Not found' };
		const fn = vi.fn().mockRejectedValue(error);

		await expect(withRetry(fn)).rejects.toEqual(error);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('uses exponential backoff delays', async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce({ status: 429 })
			.mockRejectedValueOnce({ status: 429 })
			.mockRejectedValueOnce({ status: 429 })
			.mockResolvedValue('success');

		const promise = withRetry(fn, 3, 100);

		// First attempt fails immediately
		expect(fn).toHaveBeenCalledTimes(1);

		// Wait 100ms for first retry
		await vi.advanceTimersByTimeAsync(100);
		expect(fn).toHaveBeenCalledTimes(2);

		// Wait 200ms for second retry
		await vi.advanceTimersByTimeAsync(200);
		expect(fn).toHaveBeenCalledTimes(3);

		// Wait 400ms for third retry
		await vi.advanceTimersByTimeAsync(400);
		expect(fn).toHaveBeenCalledTimes(4);

		const result = await promise;
		expect(result).toBe('success');
	});

	it('respects custom maxRetries parameter', async () => {
		const error = { status: 500 };
		const fn = vi.fn().mockRejectedValue(error);

		let caughtError: unknown;
		const promise = withRetry(fn, 1).catch((e) => {
			caughtError = e;
		});

		// Run all timers to completion
		await vi.runAllTimersAsync();
		await promise;

		expect(caughtError).toEqual(error);
		expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
	});

	it('respects custom baseDelayMs parameter', async () => {
		const fn = vi.fn().mockRejectedValueOnce({ status: 429 }).mockResolvedValue('success');

		const promise = withRetry(fn, 3, 50);

		// Should retry after 50ms, not 100ms
		await vi.advanceTimersByTimeAsync(50);

		const result = await promise;
		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
