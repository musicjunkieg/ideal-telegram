/**
 * Historical Analysis Pipeline
 *
 * Analyzes a user's post history to identify potentially toxic interactors.
 * Pipeline: Fetch posts → Get interactors → Fetch their posts → Score → Store
 */

import { eq, and } from 'drizzle-orm';
import { db, flaggedUsers, toxicEvidence, users } from '$lib/db';
import type { ToxicityScores as DbToxicityScores } from '$lib/db/schema';
import { getAuthorFeed, getProfile } from '$lib/api/bluesky';
import { getInteractors, type Interactor } from '$lib/api/constellation';
import { analyzeToxicity, getPrimaryCategory, getMaxToxicityScore, type ToxicityScores } from './ml-client';

/**
 * Options for the historical analysis
 */
export interface AnalysisOptions {
	/** Maximum posts to analyze. Default: 100. Set to undefined for full scan */
	maxPosts?: number;
	/** If true, fetches all posts (overrides maxPosts) */
	fullScan?: boolean;
}

/**
 * Result of the historical analysis
 */
export interface AnalysisResult {
	postsAnalyzed: number;
	interactorsFound: number;
	usersAnalyzed: number;
	flaggedUsers: number;
	newEvidence: number;
}

/**
 * Internal type for tracking posts to analyze
 */
interface PostToAnalyze {
	uri: string;
	text: string;
	authorDid: string;
	interactionType: 'reply' | 'mention' | 'quote';
}

/**
 * Default maximum posts for quick scan
 */
const DEFAULT_MAX_POSTS = 100;

/**
 * Maximum posts to fetch per API call
 */
const POSTS_PER_PAGE = 50;

/**
 * Analyze a user's historical interactions to find toxic users
 *
 * @param ownerDid - The authenticated user's DID
 * @param options - Analysis options
 * @returns Analysis results summary
 */
export async function analyzeUserHistory(
	ownerDid: string,
	options: AnalysisOptions = {}
): Promise<AnalysisResult> {
	const maxPosts = options.fullScan ? undefined : (options.maxPosts ?? DEFAULT_MAX_POSTS);

	// Step 1: Fetch the user's posts
	const userPosts = await fetchUserPosts(ownerDid, maxPosts);

	if (userPosts.length === 0) {
		return {
			postsAnalyzed: 0,
			interactorsFound: 0,
			usersAnalyzed: 0,
			flaggedUsers: 0,
			newEvidence: 0
		};
	}

	// Step 2: Get all interactors for these posts (replies and quotes only, skip likes)
	const allInteractors = await findAllInteractors(userPosts.map((p) => p.uri));

	if (allInteractors.length === 0) {
		return {
			postsAnalyzed: userPosts.length,
			interactorsFound: 0,
			usersAnalyzed: 0,
			flaggedUsers: 0,
			newEvidence: 0
		};
	}

	// Step 3: Fetch the interactors' posts that are replies/quotes to the user
	const postsToAnalyze = await fetchInteractorPosts(ownerDid, allInteractors, userPosts);

	if (postsToAnalyze.length === 0) {
		return {
			postsAnalyzed: userPosts.length,
			interactorsFound: allInteractors.length,
			usersAnalyzed: 0,
			flaggedUsers: 0,
			newEvidence: 0
		};
	}

	// Step 4: Analyze texts for toxicity
	const texts = postsToAnalyze.map((p) => p.text);
	const scores = await analyzeToxicity(texts);

	// Step 5: Get the user's toxicity threshold
	const user = await db.query.users.findFirst({
		where: eq(users.did, ownerDid)
	});
	const threshold = user?.toxicityThreshold ?? 0.7;

	// Step 6: Store results
	const result = await storeAnalysisResults(ownerDid, postsToAnalyze, scores, threshold);

	return {
		postsAnalyzed: userPosts.length,
		interactorsFound: allInteractors.length,
		usersAnalyzed: new Set(postsToAnalyze.map((p) => p.authorDid)).size,
		flaggedUsers: result.flaggedCount,
		newEvidence: result.evidenceCount
	};
}

/**
 * Fetch a user's posts
 */
async function fetchUserPosts(
	did: string,
	maxPosts?: number
): Promise<Array<{ uri: string; text: string }>> {
	const posts: Array<{ uri: string; text: string }> = [];
	let cursor: string | undefined;

	while (maxPosts === undefined || posts.length < maxPosts) {
		const limit = maxPosts ? Math.min(POSTS_PER_PAGE, maxPosts - posts.length) : POSTS_PER_PAGE;

		const response = await getAuthorFeed(did, did, limit);

		for (const item of response.data.feed) {
			const post = item.post;
			if (post.record && typeof post.record === 'object' && 'text' in post.record) {
				posts.push({
					uri: post.uri,
					text: post.record.text as string
				});
			}
		}

		cursor = response.data.cursor;
		if (!cursor || response.data.feed.length === 0) {
			break;
		}

		// For paginated requests, we'd need to pass cursor - but getAuthorFeed doesn't support it yet
		// For now, we'll break after first page if we need more posts
		if (maxPosts === undefined || posts.length < maxPosts) {
			// TODO: Add cursor support to getAuthorFeed for full pagination
			break;
		}
	}

	return maxPosts ? posts.slice(0, maxPosts) : posts;
}

/**
 * Find all interactors for a set of posts
 * Only includes replies and quotes (likes have no text to analyze)
 */
async function findAllInteractors(postUris: string[]): Promise<Interactor[]> {
	const interactorMap = new Map<string, Set<'reply' | 'quote' | 'like'>>();

	// Process posts in parallel batches to avoid overwhelming the API
	const BATCH_SIZE = 10;
	for (let i = 0; i < postUris.length; i += BATCH_SIZE) {
		const batch = postUris.slice(i, i + BATCH_SIZE);
		const results = await Promise.all(batch.map((uri) => getInteractors(uri)));

		for (const interactors of results) {
			for (const interactor of interactors) {
				const existing = interactorMap.get(interactor.did) ?? new Set();
				for (const type of interactor.types) {
					existing.add(type);
				}
				interactorMap.set(interactor.did, existing);
			}
		}
	}

	// Filter to only include users who replied or quoted (not just liked)
	return Array.from(interactorMap.entries())
		.filter(([, types]) => types.has('reply') || types.has('quote'))
		.map(([did, types]) => ({
			did,
			types: Array.from(types)
		}));
}

/**
 * Fetch interactor posts that are directed at the owner
 */
async function fetchInteractorPosts(
	ownerDid: string,
	interactors: Interactor[],
	ownerPosts: Array<{ uri: string }>
): Promise<PostToAnalyze[]> {
	const ownerPostUris = new Set(ownerPosts.map((p) => p.uri));
	const postsToAnalyze: PostToAnalyze[] = [];

	// Process interactors in batches
	const BATCH_SIZE = 5;
	for (let i = 0; i < interactors.length; i += BATCH_SIZE) {
		const batch = interactors.slice(i, i + BATCH_SIZE);

		const results = await Promise.all(
			batch.map(async (interactor) => {
				try {
					// Fetch interactor's recent posts
					const response = await getAuthorFeed(ownerDid, interactor.did, 50);
					const posts: PostToAnalyze[] = [];

					for (const item of response.data.feed) {
						const post = item.post;
						if (!post.record || typeof post.record !== 'object') continue;

						const record = post.record as Record<string, unknown>;
						const text = record.text as string | undefined;
						if (!text) continue;

						// Check if this is a reply to one of the owner's posts
						if (record.reply && typeof record.reply === 'object') {
							const reply = record.reply as { parent?: { uri?: string } };
							if (reply.parent?.uri && ownerPostUris.has(reply.parent.uri)) {
								posts.push({
									uri: post.uri,
									text,
									authorDid: interactor.did,
									interactionType: 'reply'
								});
							}
						}

						// Check if this is a quote of one of the owner's posts
						if (record.embed && typeof record.embed === 'object') {
							const embed = record.embed as { record?: { uri?: string }; $type?: string };
							if (
								embed.$type === 'app.bsky.embed.record' &&
								embed.record?.uri &&
								ownerPostUris.has(embed.record.uri)
							) {
								posts.push({
									uri: post.uri,
									text,
									authorDid: interactor.did,
									interactionType: 'quote'
								});
							}
						}
					}

					return posts;
				} catch {
					// Skip interactors we can't fetch (private, deleted, etc.)
					return [];
				}
			})
		);

		postsToAnalyze.push(...results.flat());
	}

	return postsToAnalyze;
}

/**
 * Store analysis results in the database
 */
async function storeAnalysisResults(
	ownerDid: string,
	posts: PostToAnalyze[],
	scores: ToxicityScores[],
	threshold: number
): Promise<{ flaggedCount: number; evidenceCount: number }> {
	// Group posts by author with their scores
	const authorPosts = new Map<
		string,
		Array<{ post: PostToAnalyze; scores: ToxicityScores; maxScore: number }>
	>();

	for (let i = 0; i < posts.length; i++) {
		const post = posts[i];
		const postScores = scores[i];
		const maxScore = getMaxToxicityScore(postScores);

		const existing = authorPosts.get(post.authorDid) ?? [];
		existing.push({ post, scores: postScores, maxScore });
		authorPosts.set(post.authorDid, existing);
	}

	let flaggedCount = 0;
	let evidenceCount = 0;

	// Process each author
	for (const [authorDid, authorData] of authorPosts) {
		// Filter to toxic posts only
		const toxicPosts = authorData.filter((d) => d.maxScore >= threshold);

		if (toxicPosts.length === 0) continue;

		// Calculate aggregate score (average of max scores for toxic posts)
		const aggregateScore =
			toxicPosts.reduce((sum, d) => sum + d.maxScore, 0) / toxicPosts.length;

		// Get author's handle for display
		let handle: string | undefined;
		try {
			const profile = await getProfile(ownerDid, authorDid);
			handle = profile.data.handle;
		} catch {
			// Handle lookup failed, leave as undefined
		}

		// Upsert flagged user
		const existingFlagged = await db.query.flaggedUsers.findFirst({
			where: and(eq(flaggedUsers.ownerDid, ownerDid), eq(flaggedUsers.flaggedDid, authorDid))
		});

		let flaggedUserId: number;

		if (existingFlagged) {
			// Update existing record
			await db
				.update(flaggedUsers)
				.set({
					aggregateToxicityScore: Math.max(existingFlagged.aggregateToxicityScore, aggregateScore),
					toxicPostCount: existingFlagged.toxicPostCount + toxicPosts.length,
					lastActivityAt: new Date(),
					flaggedHandle: handle ?? existingFlagged.flaggedHandle
				})
				.where(eq(flaggedUsers.id, existingFlagged.id));
			flaggedUserId = existingFlagged.id;
		} else {
			// Insert new record
			const [inserted] = await db
				.insert(flaggedUsers)
				.values({
					ownerDid,
					flaggedDid: authorDid,
					flaggedHandle: handle,
					aggregateToxicityScore: aggregateScore,
					toxicPostCount: toxicPosts.length,
					status: 'pending'
				})
				.returning({ id: flaggedUsers.id });
			flaggedUserId = inserted.id;
			flaggedCount++;
		}

		// Batch fetch existing evidence to avoid N+1 queries
		const existingEvidenceRecords = await db.query.toxicEvidence.findMany({
			where: eq(toxicEvidence.flaggedUserId, flaggedUserId),
			columns: { postUri: true }
		});
		const existingEvidenceUris = new Set(existingEvidenceRecords.map((e) => e.postUri));

		// Insert toxic evidence (skip duplicates)
		for (const { post, scores: postScores } of toxicPosts) {
			if (!existingEvidenceUris.has(post.uri)) {
				await db.insert(toxicEvidence).values({
					flaggedUserId,
					postUri: post.uri,
					postText: post.text,
					toxicityScores: postScores as unknown as DbToxicityScores,
					primaryCategory: getPrimaryCategory(postScores),
					interactionType: post.interactionType
				});
				evidenceCount++;
			}
		}
	}

	return { flaggedCount, evidenceCount };
}
