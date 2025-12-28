/**
 * Constellation API client for querying backlinks
 *
 * Constellation indexes social interactions across the ATProto network,
 * allowing discovery of who replied to, quoted, or liked specific posts.
 */

import { withRetry } from './retry';

const CONSTELLATION_BASE = 'https://constellation.microcosm.blue';
const USER_AGENT = 'Charcoal (github.com/musicjunkieg/ideal-telegram)';

/**
 * Source paths for different interaction types
 */
export const BACKLINK_SOURCES = {
	REPLY: 'app.bsky.feed.post:reply.parent.uri',
	QUOTE: 'app.bsky.feed.post:embed.record.uri',
	LIKE: 'app.bsky.feed.like:subject.uri'
} as const;

export type BacklinkSource = (typeof BACKLINK_SOURCES)[keyof typeof BACKLINK_SOURCES];
export type InteractionType = 'reply' | 'quote' | 'like';

/**
 * Raw backlink record from Constellation API
 */
export interface BacklinkRecord {
	did: string;
	uri: string;
	cid?: string;
}

/**
 * Constellation API response for getBacklinks
 */
interface BacklinksResponse {
	links: BacklinkRecord[];
	cursor?: string;
}

/**
 * User who interacted with a post, with their interaction types
 */
export interface Interactor {
	did: string;
	types: InteractionType[];
}

/**
 * Fetch a single page of backlinks from Constellation
 */
async function fetchBacklinksPage(
	subject: string,
	source: string,
	cursor?: string,
	limit = 100
): Promise<BacklinksResponse> {
	const params = new URLSearchParams({
		subject,
		source,
		limit: String(limit)
	});

	if (cursor) {
		params.set('cursor', cursor);
	}

	const response = await fetch(
		`${CONSTELLATION_BASE}/xrpc/blue.microcosm.links.getBacklinks?${params}`,
		{
			headers: {
				Accept: 'application/json',
				'User-Agent': USER_AGENT
			}
		}
	);

	if (!response.ok) {
		const error = new Error(`Constellation API error: ${response.status}`);
		(error as Error & { status: number }).status = response.status;
		throw error;
	}

	return response.json();
}

/**
 * Get all backlinks for a subject with auto-pagination
 *
 * @param subject - AT-URI of the post to query (e.g., at://did:plc:.../app.bsky.feed.post/...)
 * @param source - The source path for the interaction type (use BACKLINK_SOURCES constants)
 * @param maxResults - Maximum number of results to return (default: 1000)
 * @returns Array of backlink records
 */
export async function getBacklinks(
	subject: string,
	source: BacklinkSource,
	maxResults = 1000
): Promise<BacklinkRecord[]> {
	const results: BacklinkRecord[] = [];
	let cursor: string | undefined;

	while (results.length < maxResults) {
		const remaining = maxResults - results.length;
		const limit = Math.min(100, remaining);

		const response = await withRetry(() => fetchBacklinksPage(subject, source, cursor, limit));

		results.push(...response.links);

		if (!response.cursor || response.links.length === 0) {
			break;
		}

		cursor = response.cursor;
	}

	return results.slice(0, maxResults);
}

/**
 * Get all unique users who interacted with a post
 *
 * Fetches replies, quotes, and likes, then deduplicates by DID
 * and tracks which interaction types each user performed.
 *
 * @param postUri - AT-URI of the post to query
 * @param maxResultsPerType - Maximum results per interaction type (default: 1000)
 * @returns Array of interactors with their interaction types
 */
export async function getInteractors(
	postUri: string,
	maxResultsPerType = 1000
): Promise<Interactor[]> {
	// Fetch all interaction types in parallel
	const [replies, quotes, likes] = await Promise.all([
		getBacklinks(postUri, BACKLINK_SOURCES.REPLY, maxResultsPerType),
		getBacklinks(postUri, BACKLINK_SOURCES.QUOTE, maxResultsPerType),
		getBacklinks(postUri, BACKLINK_SOURCES.LIKE, maxResultsPerType)
	]);

	// Build map of DID -> interaction types
	const interactorMap = new Map<string, Set<InteractionType>>();

	const addInteraction = (records: BacklinkRecord[], type: InteractionType) => {
		for (const record of records) {
			const types = interactorMap.get(record.did) ?? new Set();
			types.add(type);
			interactorMap.set(record.did, types);
		}
	};

	addInteraction(replies, 'reply');
	addInteraction(quotes, 'quote');
	addInteraction(likes, 'like');

	// Convert to array
	return Array.from(interactorMap.entries()).map(([did, types]) => ({
		did,
		types: Array.from(types)
	}));
}
