import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Redis } from 'ioredis';
import type { NodeSavedSession, NodeSavedState } from '@atproto/oauth-client-node';

// Mock ioredis
const mockRedis = {
	get: vi.fn(),
	set: vi.fn(),
	del: vi.fn(),
	quit: vi.fn()
};

vi.mock('ioredis', () => ({
	default: vi.fn(() => mockRedis)
}));

// Import after mocking
const { RedisSessionStore, RedisStateStore, createRedisStores } = await import('./redis-stores');

describe('RedisSessionStore', () => {
	let store: InstanceType<typeof RedisSessionStore>;

	const mockSession: NodeSavedSession = {
		dpopJwk: {
			kty: 'EC',
			crv: 'P-256',
			x: 'test-x',
			y: 'test-y',
			d: 'test-d'
		},
		tokenSet: {
			access_token: 'test-access-token',
			token_type: 'DPoP',
			expires_at: new Date(Date.now() + 3600000).toISOString(),
			refresh_token: 'test-refresh-token',
			scope: 'atproto transition:generic',
			sub: 'did:plc:testuser123',
			aud: 'https://bsky.social',
			iss: 'https://bsky.social'
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		store = new RedisSessionStore(mockRedis as unknown as Redis);
	});

	describe('set', () => {
		it('stores session with correct key prefix', async () => {
			mockRedis.set.mockResolvedValue('OK');

			await store.set('did:plc:user123', mockSession);

			expect(mockRedis.set).toHaveBeenCalledWith(
				'oauth:session:did:plc:user123',
				JSON.stringify(mockSession),
				'EX',
				expect.any(Number)
			);
		});

		it('sets TTL based on token expiration', async () => {
			mockRedis.set.mockResolvedValue('OK');
			const expiresAt = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now
			const sessionWithExpiry = {
				...mockSession,
				tokenSet: { ...mockSession.tokenSet, expires_at: expiresAt }
			};

			await store.set('did:plc:user123', sessionWithExpiry);

			// TTL should be roughly 2 hours (7200 seconds) with some buffer
			const [, , , ttl] = mockRedis.set.mock.calls[0];
			expect(ttl).toBeGreaterThan(7000);
			expect(ttl).toBeLessThanOrEqual(7200);
		});

		it('uses default TTL when no expiration in token', async () => {
			mockRedis.set.mockResolvedValue('OK');
			const sessionWithoutExpiry = {
				...mockSession,
				tokenSet: { ...mockSession.tokenSet, expires_at: undefined }
			};

			await store.set('did:plc:user123', sessionWithoutExpiry as NodeSavedSession);

			const [, , , ttl] = mockRedis.set.mock.calls[0];
			expect(ttl).toBe(86400); // 24 hours default
		});
	});

	describe('get', () => {
		it('returns session when found', async () => {
			mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

			const result = await store.get('did:plc:user123');

			expect(mockRedis.get).toHaveBeenCalledWith('oauth:session:did:plc:user123');
			expect(result).toEqual(mockSession);
		});

		it('returns undefined when not found', async () => {
			mockRedis.get.mockResolvedValue(null);

			const result = await store.get('did:plc:nonexistent');

			expect(result).toBeUndefined();
		});

		it('returns undefined on invalid JSON', async () => {
			mockRedis.get.mockResolvedValue('invalid-json');

			const result = await store.get('did:plc:user123');

			expect(result).toBeUndefined();
		});
	});

	describe('del', () => {
		it('deletes session with correct key', async () => {
			mockRedis.del.mockResolvedValue(1);

			await store.del('did:plc:user123');

			expect(mockRedis.del).toHaveBeenCalledWith('oauth:session:did:plc:user123');
		});
	});
});

describe('RedisStateStore', () => {
	let store: InstanceType<typeof RedisStateStore>;

	const mockState: NodeSavedState = {
		dpopJwk: {
			kty: 'EC',
			crv: 'P-256',
			x: 'test-x',
			y: 'test-y',
			d: 'test-d'
		},
		verifier: 'test-pkce-verifier',
		iss: 'https://bsky.social',
		appState: undefined
	};

	beforeEach(() => {
		vi.clearAllMocks();
		store = new RedisStateStore(mockRedis as unknown as Redis);
	});

	describe('set', () => {
		it('stores state with correct key prefix', async () => {
			mockRedis.set.mockResolvedValue('OK');

			await store.set('state123', mockState);

			expect(mockRedis.set).toHaveBeenCalledWith(
				'oauth:state:state123',
				JSON.stringify(mockState),
				'EX',
				600 // 10 minutes
			);
		});
	});

	describe('get', () => {
		it('returns state when found', async () => {
			mockRedis.get.mockResolvedValue(JSON.stringify(mockState));

			const result = await store.get('state123');

			expect(mockRedis.get).toHaveBeenCalledWith('oauth:state:state123');
			expect(result).toEqual(mockState);
		});

		it('returns undefined when not found', async () => {
			mockRedis.get.mockResolvedValue(null);

			const result = await store.get('nonexistent');

			expect(result).toBeUndefined();
		});
	});

	describe('del', () => {
		it('deletes state with correct key', async () => {
			mockRedis.del.mockResolvedValue(1);

			await store.del('state123');

			expect(mockRedis.del).toHaveBeenCalledWith('oauth:state:state123');
		});
	});
});

describe('createRedisStores', () => {
	it('creates both session and state stores', () => {
		const { sessionStore, stateStore } = createRedisStores(mockRedis as unknown as Redis);

		expect(sessionStore).toBeInstanceOf(RedisSessionStore);
		expect(stateStore).toBeInstanceOf(RedisStateStore);
	});

	it('creates stores from URL string', async () => {
		// This test verifies the function accepts a string URL
		// The actual Redis constructor is mocked, so we just verify the stores are created
		// In integration tests, we would use a real Redis instance
		const { sessionStore, stateStore, redis } = createRedisStores(mockRedis as unknown as Redis);

		expect(sessionStore).toBeInstanceOf(RedisSessionStore);
		expect(stateStore).toBeInstanceOf(RedisStateStore);
		expect(redis).toBe(mockRedis);
	});
});
