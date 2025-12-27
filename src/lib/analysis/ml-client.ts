/**
 * ML Service client for toxicity analysis
 *
 * Communicates with the Python FastAPI service running Detoxify.
 */

import { withRetry } from '$lib/api/retry';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://ml-service:3001';
const BATCH_SIZE = 50;

/**
 * Toxicity scores returned by the ML service
 */
export interface ToxicityScores {
	toxic: number;
	severe_toxic: number;
	obscene: number;
	threat: number;
	insult: number;
	identity_attack: number;
}

/**
 * Response from the ML service /analyze endpoint
 */
interface AnalyzeResponse {
	results: ToxicityScores[];
}

/**
 * Analyze a batch of texts for toxicity
 *
 * @param texts - Array of texts to analyze
 * @returns Array of toxicity scores (same order as input)
 * @throws Error if ML service returns non-OK response or times out
 */
async function analyzeBatch(texts: string[]): Promise<ToxicityScores[]> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

	try {
		const response = await fetch(`${ML_SERVICE_URL}/analyze`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ texts }),
			signal: controller.signal
		});

		if (!response.ok) {
			const error = new Error(`ML service error: ${response.status}`);
			(error as Error & { status: number }).status = response.status;
			throw error;
		}

		const data: AnalyzeResponse = await response.json();

		// Validate response length matches input
		if (data.results.length !== texts.length) {
			throw new Error(
				`ML service returned ${data.results.length} results but expected ${texts.length}`
			);
		}

		return data.results;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Analyze texts for toxicity, batching requests to the ML service
 *
 * @param texts - Array of texts to analyze
 * @param batchSize - Number of texts per ML service call (default: 50)
 * @returns Array of toxicity scores (same order as input)
 */
export async function analyzeToxicity(
	texts: string[],
	batchSize = BATCH_SIZE
): Promise<ToxicityScores[]> {
	if (texts.length === 0) {
		return [];
	}

	const results: ToxicityScores[] = [];

	// Process in batches
	for (let i = 0; i < texts.length; i += batchSize) {
		const batch = texts.slice(i, i + batchSize);
		const batchResults = await withRetry(() => analyzeBatch(batch));
		results.push(...batchResults);
	}

	return results;
}

/**
 * Get the primary toxicity category (highest scoring)
 *
 * @param scores - Toxicity scores object
 * @returns The category name with the highest score
 */
export function getPrimaryCategory(scores: ToxicityScores): keyof ToxicityScores {
	const entries = Object.entries(scores) as [keyof ToxicityScores, number][];
	const [category] = entries.reduce((max, current) => (current[1] > max[1] ? current : max));
	return category;
}

/**
 * Get the maximum toxicity score across all categories
 *
 * @param scores - Toxicity scores object
 * @returns The highest score value
 */
export function getMaxToxicityScore(scores: ToxicityScores): number {
	return Math.max(...Object.values(scores));
}

/**
 * Check if the ML service is healthy
 *
 * @returns True if the service is reachable and healthy
 */
export async function checkMlServiceHealth(): Promise<boolean> {
	try {
		const response = await fetch(`${ML_SERVICE_URL}/health`);
		if (!response.ok) return false;
		const data = await response.json();
		return data.status === 'ok';
	} catch {
		return false;
	}
}
