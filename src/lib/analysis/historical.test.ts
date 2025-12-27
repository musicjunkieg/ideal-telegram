import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('$lib/db', () => ({
	db: {
		query: {
			users: { findFirst: vi.fn() },
			flaggedUsers: { findFirst: vi.fn() },
			toxicEvidence: { findFirst: vi.fn(), findMany: vi.fn() }
		},
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: vi.fn(() => Promise.resolve([{ id: 1 }]))
			}))
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve())
			}))
		}))
	},
	flaggedUsers: {},
	toxicEvidence: {},
	users: {}
}));

vi.mock('$lib/api/bluesky', () => ({
	getAuthorFeed: vi.fn(),
	getProfile: vi.fn()
}));

vi.mock('$lib/api/constellation', () => ({
	getInteractors: vi.fn()
}));

vi.mock('./ml-client', () => ({
	analyzeToxicity: vi.fn(),
	getPrimaryCategory: vi.fn(() => 'toxic'),
	getMaxToxicityScore: vi.fn()
}));

// Import after mocking
const { analyzeUserHistory } = await import('./historical');
const { db } = await import('$lib/db');
const { getAuthorFeed, getProfile } = await import('$lib/api/bluesky');
const { getInteractors } = await import('$lib/api/constellation');
const { analyzeToxicity, getMaxToxicityScore } = await import('./ml-client');

describe('analyzeUserHistory', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock implementations
		(db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
			did: 'did:plc:owner',
			toxicityThreshold: 0.7
		});
		(db.query.flaggedUsers.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		(db.query.toxicEvidence.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		(db.query.toxicEvidence.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
	});

	it('returns zeros when user has no posts', async () => {
		(getAuthorFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: { feed: [], cursor: undefined }
		});

		const result = await analyzeUserHistory('did:plc:owner');

		expect(result).toEqual({
			postsAnalyzed: 0,
			interactorsFound: 0,
			usersAnalyzed: 0,
			flaggedUsers: 0,
			newEvidence: 0
		});
	});

	it('returns zeros when posts have no interactors', async () => {
		(getAuthorFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: {
				feed: [
					{
						post: {
							uri: 'at://did:plc:owner/app.bsky.feed.post/1',
							record: { text: 'Hello world' }
						}
					}
				],
				cursor: undefined
			}
		});
		(getInteractors as ReturnType<typeof vi.fn>).mockResolvedValue([]);

		const result = await analyzeUserHistory('did:plc:owner');

		expect(result.postsAnalyzed).toBe(1);
		expect(result.interactorsFound).toBe(0);
	});

	it('analyzes interactor posts and flags toxic users', async () => {
		// Owner has one post
		(getAuthorFeed as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				data: {
					feed: [
						{
							post: {
								uri: 'at://did:plc:owner/app.bsky.feed.post/1',
								record: { text: 'Hello world' }
							}
						}
					],
					cursor: undefined
				}
			})
			// Interactor's feed
			.mockResolvedValueOnce({
				data: {
					feed: [
						{
							post: {
								uri: 'at://did:plc:toxic/app.bsky.feed.post/reply1',
								record: {
									text: 'Toxic reply',
									reply: { parent: { uri: 'at://did:plc:owner/app.bsky.feed.post/1' } }
								}
							}
						}
					],
					cursor: undefined
				}
			});

		// One interactor who replied
		(getInteractors as ReturnType<typeof vi.fn>).mockResolvedValue([
			{ did: 'did:plc:toxic', types: ['reply'] }
		]);

		// Mock toxicity analysis
		(analyzeToxicity as ReturnType<typeof vi.fn>).mockResolvedValue([
			{ toxic: 0.9, severe_toxic: 0.1, obscene: 0.2, threat: 0.1, insult: 0.3, identity_attack: 0.1 }
		]);
		(getMaxToxicityScore as ReturnType<typeof vi.fn>).mockReturnValue(0.9);

		// Mock profile lookup
		(getProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: { handle: 'toxic.user' }
		});

		const result = await analyzeUserHistory('did:plc:owner');

		expect(result.postsAnalyzed).toBe(1);
		expect(result.interactorsFound).toBe(1);
		expect(result.usersAnalyzed).toBe(1);
		expect(result.flaggedUsers).toBe(1);
		expect(result.newEvidence).toBe(1);

		// Verify database insert was called
		expect(db.insert).toHaveBeenCalled();
	});

	it('skips users with scores below threshold', async () => {
		(getAuthorFeed as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				data: {
					feed: [
						{
							post: {
								uri: 'at://did:plc:owner/app.bsky.feed.post/1',
								record: { text: 'Hello' }
							}
						}
					],
					cursor: undefined
				}
			})
			.mockResolvedValueOnce({
				data: {
					feed: [
						{
							post: {
								uri: 'at://did:plc:nice/app.bsky.feed.post/reply1',
								record: {
									text: 'Nice reply',
									reply: { parent: { uri: 'at://did:plc:owner/app.bsky.feed.post/1' } }
								}
							}
						}
					],
					cursor: undefined
				}
			});

		(getInteractors as ReturnType<typeof vi.fn>).mockResolvedValue([
			{ did: 'did:plc:nice', types: ['reply'] }
		]);

		// Below threshold (0.7)
		(analyzeToxicity as ReturnType<typeof vi.fn>).mockResolvedValue([
			{ toxic: 0.3, severe_toxic: 0.1, obscene: 0.1, threat: 0.1, insult: 0.2, identity_attack: 0.1 }
		]);
		(getMaxToxicityScore as ReturnType<typeof vi.fn>).mockReturnValue(0.3);

		const result = await analyzeUserHistory('did:plc:owner');

		expect(result.flaggedUsers).toBe(0);
		expect(result.newEvidence).toBe(0);
	});

	it('respects maxPosts option', async () => {
		(getAuthorFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: {
				feed: Array.from({ length: 50 }, (_, i) => ({
					post: {
						uri: `at://did:plc:owner/app.bsky.feed.post/${i}`,
						record: { text: `Post ${i}` }
					}
				})),
				cursor: 'next'
			}
		});
		(getInteractors as ReturnType<typeof vi.fn>).mockResolvedValue([]);

		const result = await analyzeUserHistory('did:plc:owner', { maxPosts: 10 });

		expect(result.postsAnalyzed).toBe(10);
	});

	it('filters out like-only interactors', async () => {
		(getAuthorFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: {
				feed: [
					{
						post: {
							uri: 'at://did:plc:owner/app.bsky.feed.post/1',
							record: { text: 'Hello' }
						}
					}
				],
				cursor: undefined
			}
		});

		// Interactor only liked (no reply or quote)
		(getInteractors as ReturnType<typeof vi.fn>).mockResolvedValue([
			{ did: 'did:plc:liker', types: ['like'] }
		]);

		const result = await analyzeUserHistory('did:plc:owner');

		expect(result.interactorsFound).toBe(0); // Likes are filtered out
		expect(result.usersAnalyzed).toBe(0);
	});
});
