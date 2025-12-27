import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the NodeOAuthClient for unit testing
const mockAuthorize = vi.fn().mockResolvedValue({
	url: new URL('https://bsky.social/oauth/authorize?state=test')
});
const mockCallback = vi.fn().mockRejectedValue(new Error('Invalid state'));
const mockRestore = vi.fn().mockResolvedValue(undefined);

vi.mock('@atproto/oauth-client-node', () => {
	return {
		NodeOAuthClient: class MockNodeOAuthClient {
			authorize = mockAuthorize;
			callback = mockCallback;
			restore = mockRestore;

			constructor() {
				// Mock constructor
			}
		}
	};
});

// Tests for OAuth client module
// TDD: Write tests first, then implement

describe('OAuth Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset module state between tests
		vi.resetModules();
	});

	describe('createOAuthClient', () => {
		it('should create an OAuth client with required stores', async () => {
			const { createOAuthClient } = await import('./client');

			const client = await createOAuthClient({
				clientId: 'https://example.com/client-metadata.json'
			});

			expect(client).toBeDefined();
			expect(client.authorize).toBeInstanceOf(Function);
			expect(client.callback).toBeInstanceOf(Function);
		});

		it('should use provided client ID', async () => {
			const { createOAuthClient, getClientId } = await import('./client');

			const clientId = 'https://example.com/client-metadata.json';
			await createOAuthClient({ clientId });

			expect(getClientId()).toBe(clientId);
		});
	});

	describe('authorize', () => {
		it('should generate authorization URL for a handle', async () => {
			const { createOAuthClient } = await import('./client');

			const client = await createOAuthClient({
				clientId: 'https://example.com/client-metadata.json'
			});

			const result = (await client.authorize('test.bsky.social', {
				scope: 'atproto transition:generic'
			})) as unknown as { url: URL };

			// Result has a url property containing the authorization URL
			expect(result).toBeDefined();
			expect(result.url).toBeInstanceOf(URL);
			expect(result.url.toString()).toContain('authorize');
		});
	});

	describe('callback', () => {
		it('should reject with invalid state', async () => {
			const { createOAuthClient } = await import('./client');

			const client = await createOAuthClient({
				clientId: 'https://example.com/client-metadata.json'
			});

			await expect(
				client.callback(new URLSearchParams({ code: 'test', state: 'invalid' }))
			).rejects.toThrow('Invalid state');
		});
	});

	describe('session management', () => {
		it('should return undefined for non-existent session', async () => {
			const { createOAuthClient } = await import('./client');

			const client = await createOAuthClient({
				clientId: 'https://example.com/client-metadata.json'
			});

			const session = await client.restore('did:plc:unknown');
			expect(session).toBeUndefined();
		});
	});

	describe('getOAuthClient', () => {
		it('should throw if client not initialized', async () => {
			vi.resetModules();
			const { getOAuthClient } = await import('./client');

			expect(() => getOAuthClient()).toThrow('OAuth client not initialized');
		});

		it('should return client after initialization', async () => {
			const { createOAuthClient, getOAuthClient } = await import('./client');

			await createOAuthClient({
				clientId: 'https://example.com/client-metadata.json'
			});

			const client = getOAuthClient();
			expect(client).toBeDefined();
		});
	});
});

describe('OAuth Stores', () => {
	describe('MemoryStateStore', () => {
		it('should store and retrieve state', async () => {
			const { MemoryStateStore } = await import('./stores');

			const store = new MemoryStateStore();
			const key = 'test-key';
			// Use a minimal mock that satisfies the store interface
			const value = { dpopJwk: { kty: 'EC' as const } } as Parameters<
				typeof store.set
			>[1];

			await store.set(key, value);
			const retrieved = await store.get(key);

			expect(retrieved).toEqual(value);
		});

		it('should delete state', async () => {
			const { MemoryStateStore } = await import('./stores');

			const store = new MemoryStateStore();
			const key = 'test-key';
			const value = { dpopJwk: { kty: 'EC' as const } } as Parameters<
				typeof store.set
			>[1];

			await store.set(key, value);
			await store.del(key);
			const retrieved = await store.get(key);

			expect(retrieved).toBeUndefined();
		});
	});

	describe('MemorySessionStore', () => {
		it('should store and retrieve sessions', async () => {
			const { MemorySessionStore } = await import('./stores');

			const store = new MemorySessionStore();
			const did = 'did:plc:test123';
			// Use a minimal mock that satisfies the store interface
			const session = { dpopJwk: { kty: 'EC' as const } } as Parameters<
				typeof store.set
			>[1];

			await store.set(did, session);
			const retrieved = await store.get(did);

			expect(retrieved).toEqual(session);
		});
	});
});
