import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBacklinks, getInteractors, BACKLINK_SOURCES } from './constellation';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createMockResponse(links: Array<{ did: string; uri: string }>, cursor?: string) {
	return {
		ok: true,
		json: () => Promise.resolve({ links, cursor })
	};
}

function createErrorResponse(status: number) {
	return {
		ok: false,
		status
	};
}

describe('getBacklinks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches backlinks for a post', async () => {
		const mockLinks = [
			{ did: 'did:plc:user1', uri: 'at://did:plc:user1/app.bsky.feed.post/1' },
			{ did: 'did:plc:user2', uri: 'at://did:plc:user2/app.bsky.feed.post/2' }
		];
		mockFetch.mockResolvedValueOnce(createMockResponse(mockLinks));

		const result = await getBacklinks(
			'at://did:plc:test/app.bsky.feed.post/123',
			BACKLINK_SOURCES.REPLY
		);

		expect(result).toEqual(mockLinks);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('constellation.microcosm.blue'),
			expect.objectContaining({
				headers: expect.objectContaining({
					'User-Agent': expect.stringContaining('Bluesky Toxicity Shield')
				})
			})
		);
	});

	it('handles pagination automatically', async () => {
		const page1 = [
			{ did: 'did:plc:user1', uri: 'at://did:plc:user1/app.bsky.feed.post/1' },
			{ did: 'did:plc:user2', uri: 'at://did:plc:user2/app.bsky.feed.post/2' }
		];
		const page2 = [{ did: 'did:plc:user3', uri: 'at://did:plc:user3/app.bsky.feed.post/3' }];

		mockFetch
			.mockResolvedValueOnce(createMockResponse(page1, 'cursor1'))
			.mockResolvedValueOnce(createMockResponse(page2));

		const result = await getBacklinks(
			'at://did:plc:test/app.bsky.feed.post/123',
			BACKLINK_SOURCES.LIKE
		);

		expect(result).toHaveLength(3);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('respects maxResults limit', async () => {
		const manyLinks = Array.from({ length: 100 }, (_, i) => ({
			did: `did:plc:user${i}`,
			uri: `at://did:plc:user${i}/app.bsky.feed.post/${i}`
		}));

		mockFetch
			.mockResolvedValueOnce(createMockResponse(manyLinks, 'cursor1'))
			.mockResolvedValueOnce(createMockResponse(manyLinks, 'cursor2'));

		const result = await getBacklinks(
			'at://did:plc:test/app.bsky.feed.post/123',
			BACKLINK_SOURCES.REPLY,
			150
		);

		expect(result).toHaveLength(150);
	});

	it('retries on server error', async () => {
		vi.useFakeTimers();

		mockFetch
			.mockResolvedValueOnce(createErrorResponse(500))
			.mockResolvedValueOnce(
				createMockResponse([{ did: 'did:plc:user1', uri: 'at://did:plc:user1/post/1' }])
			);

		const promise = getBacklinks(
			'at://did:plc:test/app.bsky.feed.post/123',
			BACKLINK_SOURCES.REPLY
		);

		await vi.runAllTimersAsync();

		const result = await promise;

		expect(result).toHaveLength(1);
		expect(mockFetch).toHaveBeenCalledTimes(2);

		vi.useRealTimers();
	});

	it('throws on non-retryable error', async () => {
		mockFetch.mockResolvedValueOnce(createErrorResponse(404));

		await expect(
			getBacklinks('at://did:plc:test/app.bsky.feed.post/123', BACKLINK_SOURCES.REPLY)
		).rejects.toThrow('Constellation API error: 404');
	});
});

describe('getInteractors', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches all interaction types in parallel', async () => {
		const replies = [{ did: 'did:plc:replier', uri: 'at://did:plc:replier/post/1' }];
		const quotes = [{ did: 'did:plc:quoter', uri: 'at://did:plc:quoter/post/2' }];
		const likes = [{ did: 'did:plc:liker', uri: 'at://did:plc:liker/like/3' }];

		mockFetch
			.mockResolvedValueOnce(createMockResponse(replies))
			.mockResolvedValueOnce(createMockResponse(quotes))
			.mockResolvedValueOnce(createMockResponse(likes));

		const result = await getInteractors('at://did:plc:test/app.bsky.feed.post/123');

		expect(result).toHaveLength(3);
		expect(result).toContainEqual({ did: 'did:plc:replier', types: ['reply'] });
		expect(result).toContainEqual({ did: 'did:plc:quoter', types: ['quote'] });
		expect(result).toContainEqual({ did: 'did:plc:liker', types: ['like'] });
	});

	it('deduplicates users with multiple interaction types', async () => {
		const sameUser = { did: 'did:plc:poweruser', uri: 'at://did:plc:poweruser/post/1' };

		mockFetch
			.mockResolvedValueOnce(createMockResponse([sameUser])) // reply
			.mockResolvedValueOnce(createMockResponse([sameUser])) // quote
			.mockResolvedValueOnce(createMockResponse([sameUser])); // like

		const result = await getInteractors('at://did:plc:test/app.bsky.feed.post/123');

		expect(result).toHaveLength(1);
		expect(result[0].did).toBe('did:plc:poweruser');
		expect(result[0].types).toContain('reply');
		expect(result[0].types).toContain('quote');
		expect(result[0].types).toContain('like');
	});

	it('handles empty results', async () => {
		mockFetch
			.mockResolvedValueOnce(createMockResponse([]))
			.mockResolvedValueOnce(createMockResponse([]))
			.mockResolvedValueOnce(createMockResponse([]));

		const result = await getInteractors('at://did:plc:test/app.bsky.feed.post/123');

		expect(result).toHaveLength(0);
	});

	it('handles mixed results with some empty', async () => {
		const replies = [{ did: 'did:plc:replier', uri: 'at://did:plc:replier/post/1' }];

		mockFetch
			.mockResolvedValueOnce(createMockResponse(replies))
			.mockResolvedValueOnce(createMockResponse([]))
			.mockResolvedValueOnce(createMockResponse([]));

		const result = await getInteractors('at://did:plc:test/app.bsky.feed.post/123');

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ did: 'did:plc:replier', types: ['reply'] });
	});
});

describe('BACKLINK_SOURCES', () => {
	it('exports correct source paths', () => {
		expect(BACKLINK_SOURCES.REPLY).toBe('app.bsky.feed.post:reply.parent.uri');
		expect(BACKLINK_SOURCES.QUOTE).toBe('app.bsky.feed.post:embed.record.uri');
		expect(BACKLINK_SOURCES.LIKE).toBe('app.bsky.feed.like:subject.uri');
	});
});
