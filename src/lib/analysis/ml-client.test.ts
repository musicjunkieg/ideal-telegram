import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	analyzeToxicity,
	getPrimaryCategory,
	getMaxToxicityScore,
	checkMlServiceHealth,
	type ToxicityScores
} from './ml-client';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createMockScores(overrides: Partial<ToxicityScores> = {}): ToxicityScores {
	return {
		toxic: 0.1,
		severe_toxic: 0.05,
		obscene: 0.08,
		threat: 0.02,
		insult: 0.15,
		identity_attack: 0.03,
		...overrides
	};
}

describe('analyzeToxicity', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns empty array for empty input', async () => {
		const result = await analyzeToxicity([]);
		expect(result).toEqual([]);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('analyzes a single text', async () => {
		const mockScores = createMockScores({ toxic: 0.8 });
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ results: [mockScores] })
		});

		const result = await analyzeToxicity(['Hello world']);

		expect(result).toHaveLength(1);
		expect(result[0].toxic).toBe(0.8);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('batches requests for many texts', async () => {
		const mockScores = createMockScores();
		// Create 75 texts (should result in 2 batches: 50 + 25)
		const texts = Array.from({ length: 75 }, (_, i) => `Text ${i}`);

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: Array(50).fill(mockScores) })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: Array(25).fill(mockScores) })
			});

		const result = await analyzeToxicity(texts);

		expect(result).toHaveLength(75);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('throws on ML service error after retries', async () => {
		// Mock all retry attempts to fail
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500
		});

		await expect(analyzeToxicity(['Hello'])).rejects.toThrow('ML service error: 500');

		// Should have tried 4 times (initial + 3 retries)
		expect(mockFetch).toHaveBeenCalledTimes(4);
	});

	it('retries on transient errors', async () => {
		vi.useFakeTimers();

		const mockScores = createMockScores();
		mockFetch
			.mockResolvedValueOnce({ ok: false, status: 500 })
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: [mockScores] })
			});

		const promise = analyzeToxicity(['Hello']);

		await vi.runAllTimersAsync();

		const result = await promise;

		expect(result).toHaveLength(1);
		expect(mockFetch).toHaveBeenCalledTimes(2);

		vi.useRealTimers();
	});
});

describe('getPrimaryCategory', () => {
	it('returns the highest scoring category', () => {
		const scores = createMockScores({ insult: 0.9, toxic: 0.3 });
		expect(getPrimaryCategory(scores)).toBe('insult');
	});

	it('handles ties by returning first found', () => {
		const scores: ToxicityScores = {
			toxic: 0.5,
			severe_toxic: 0.5,
			obscene: 0.1,
			threat: 0.1,
			insult: 0.1,
			identity_attack: 0.1
		};
		// Should return 'toxic' as it comes first
		expect(getPrimaryCategory(scores)).toBe('toxic');
	});
});

describe('getMaxToxicityScore', () => {
	it('returns the maximum score value', () => {
		const scores = createMockScores({ threat: 0.95 });
		expect(getMaxToxicityScore(scores)).toBe(0.95);
	});

	it('handles all zeros', () => {
		const scores: ToxicityScores = {
			toxic: 0,
			severe_toxic: 0,
			obscene: 0,
			threat: 0,
			insult: 0,
			identity_attack: 0
		};
		expect(getMaxToxicityScore(scores)).toBe(0);
	});
});

describe('checkMlServiceHealth', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns true when service is healthy', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ status: 'ok', model_loaded: true })
		});

		const result = await checkMlServiceHealth();

		expect(result).toBe(true);
	});

	it('returns false when service returns non-ok status', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ status: 'error' })
		});

		const result = await checkMlServiceHealth();

		expect(result).toBe(false);
	});

	it('returns false when service is unreachable', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

		const result = await checkMlServiceHealth();

		expect(result).toBe(false);
	});

	it('returns false on HTTP error', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

		const result = await checkMlServiceHealth();

		expect(result).toBe(false);
	});
});
