import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the OAuth client
const mockSession = { did: 'did:plc:testuser123' };
const mockOAuthClient = {
	restore: vi.fn()
};

vi.mock('$lib/oauth/client', () => ({
	getOAuthClient: () => mockOAuthClient
}));

// Mock the Agent class - use a class to support `new` calls
const mockAgent = {
	getProfile: vi.fn(),
	getAuthorFeed: vi.fn()
};

class MockAgent {
	constructor() {
		return mockAgent;
	}
}

vi.mock('@atproto/api', () => ({
	Agent: MockAgent
}));

// Import after mocking
const { getAuthenticatedAgent, getProfile, getAuthorFeed } = await import('./bluesky');

describe('getAuthenticatedAgent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns an Agent when session exists', async () => {
		mockOAuthClient.restore.mockResolvedValue(mockSession);

		const agent = await getAuthenticatedAgent('did:plc:testuser123');

		expect(mockOAuthClient.restore).toHaveBeenCalledWith('did:plc:testuser123');
		expect(agent).toBe(mockAgent);
	});

	it('throws error when no session exists', async () => {
		mockOAuthClient.restore.mockResolvedValue(null);

		await expect(getAuthenticatedAgent('did:plc:unknown')).rejects.toThrow(
			'No OAuth session found for DID: did:plc:unknown'
		);
	});
});

describe('getProfile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOAuthClient.restore.mockResolvedValue(mockSession);
	});

	it('fetches profile for the authenticated user by default', async () => {
		const mockProfileData = {
			data: {
				did: 'did:plc:testuser123',
				handle: 'testuser.bsky.social',
				displayName: 'Test User'
			}
		};
		mockAgent.getProfile.mockResolvedValue(mockProfileData);

		const result = await getProfile('did:plc:testuser123');

		expect(mockAgent.getProfile).toHaveBeenCalledWith({ actor: 'did:plc:testuser123' });
		expect(result).toEqual(mockProfileData);
	});

	it('fetches profile for a specific actor', async () => {
		const mockProfileData = {
			data: {
				did: 'did:plc:otheruserxyz',
				handle: 'otheruser.bsky.social',
				displayName: 'Other User'
			}
		};
		mockAgent.getProfile.mockResolvedValue(mockProfileData);

		const result = await getProfile('did:plc:testuser123', 'did:plc:otheruserxyz');

		expect(mockAgent.getProfile).toHaveBeenCalledWith({ actor: 'did:plc:otheruserxyz' });
		expect(result).toEqual(mockProfileData);
	});

	it('retries on rate limit error', async () => {
		vi.useFakeTimers();

		mockAgent.getProfile
			.mockRejectedValueOnce({ status: 429 })
			.mockResolvedValue({ data: { did: 'did:plc:testuser123' } });

		const promise = getProfile('did:plc:testuser123');

		await vi.runAllTimersAsync();

		const result = await promise;

		expect(mockAgent.getProfile).toHaveBeenCalledTimes(2);
		expect(result.data.did).toBe('did:plc:testuser123');

		vi.useRealTimers();
	});
});

describe('getAuthorFeed', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOAuthClient.restore.mockResolvedValue(mockSession);
	});

	it('fetches feed for the authenticated user by default', async () => {
		const mockFeedData = {
			data: {
				feed: [{ post: { uri: 'at://did:plc:testuser123/app.bsky.feed.post/123' } }]
			}
		};
		mockAgent.getAuthorFeed.mockResolvedValue(mockFeedData);

		const result = await getAuthorFeed('did:plc:testuser123');

		expect(mockAgent.getAuthorFeed).toHaveBeenCalledWith({
			actor: 'did:plc:testuser123',
			limit: 50
		});
		expect(result).toEqual(mockFeedData);
	});

	it('fetches feed for a specific actor', async () => {
		const mockFeedData = {
			data: {
				feed: [{ post: { uri: 'at://did:plc:otheruserxyz/app.bsky.feed.post/456' } }]
			}
		};
		mockAgent.getAuthorFeed.mockResolvedValue(mockFeedData);

		const result = await getAuthorFeed('did:plc:testuser123', 'did:plc:otheruserxyz');

		expect(mockAgent.getAuthorFeed).toHaveBeenCalledWith({
			actor: 'did:plc:otheruserxyz',
			limit: 50
		});
		expect(result).toEqual(mockFeedData);
	});

	it('uses custom limit', async () => {
		mockAgent.getAuthorFeed.mockResolvedValue({ data: { feed: [] } });

		await getAuthorFeed('did:plc:testuser123', undefined, 25);

		expect(mockAgent.getAuthorFeed).toHaveBeenCalledWith({
			actor: 'did:plc:testuser123',
			limit: 25
		});
	});

	it('retries on server error', async () => {
		vi.useFakeTimers();

		mockAgent.getAuthorFeed
			.mockRejectedValueOnce({ status: 500 })
			.mockResolvedValue({ data: { feed: [] } });

		const promise = getAuthorFeed('did:plc:testuser123');

		await vi.runAllTimersAsync();

		const result = await promise;

		expect(mockAgent.getAuthorFeed).toHaveBeenCalledTimes(2);
		expect(result.data.feed).toEqual([]);

		vi.useRealTimers();
	});
});
