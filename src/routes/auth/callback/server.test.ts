/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Cookies } from '@sveltejs/kit';

// Mock the OAuth client
const mockCallback = vi.fn();
vi.mock('$lib/oauth/client', () => ({
	getOAuthClient: vi.fn(() => ({
		callback: mockCallback
	}))
}));

// Mock environment
vi.mock('$env/static/private', () => ({
	SESSION_SECRET: '0uNTnZMGtmCICdv/NYubOJEvZQ1LPrlvsQOHmWnzz+E='
}));

// Mock global fetch for handle resolution
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to create mock cookies
function createMockCookies(): Cookies & { store: Map<string, string> } {
	const store = new Map<string, string>();
	return {
		store,
		get: vi.fn((name: string) => store.get(name)),
		getAll: vi.fn(() => Array.from(store.entries()).map(([name, value]) => ({ name, value }))),
		set: vi.fn((name: string, value: string) => store.set(name, value)),
		delete: vi.fn((name: string) => store.delete(name)),
		serialize: vi.fn(() => '')
	};
}

describe('GET /auth/callback', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock for handle resolution
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ handle: 'testuser.bsky.social' })
		});
	});

	it('creates session and redirects to home on successful callback', async () => {
		// OAuthSession only has 'did', not 'handle'
		const mockSession = {
			did: 'did:plc:testuser123'
		};
		mockCallback.mockResolvedValue({ session: mockSession });

		const { GET } = await import('./+server');

		const cookies = createMockCookies();
		const url = new URL('http://localhost/auth/callback?code=authcode&state=teststate');

		const response = await GET({
			url,
			cookies
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
		expect(cookies.set).toHaveBeenCalled();
		expect(mockCallback).toHaveBeenCalledWith(expect.any(URLSearchParams));
	});

	it('returns 400 when code is missing', async () => {
		const { GET } = await import('./+server');

		const cookies = createMockCookies();
		const url = new URL('http://localhost/auth/callback?state=teststate');

		const response = await GET({
			url,
			cookies
		} as any);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Missing authorization code');
	});

	it('returns 400 when state is missing', async () => {
		const { GET } = await import('./+server');

		const cookies = createMockCookies();
		const url = new URL('http://localhost/auth/callback?code=authcode');

		const response = await GET({
			url,
			cookies
		} as any);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Missing state parameter');
	});

	it('returns 401 when OAuth callback fails with invalid state', async () => {
		mockCallback.mockRejectedValue(new Error('Invalid state'));

		const { GET } = await import('./+server');

		const cookies = createMockCookies();
		const url = new URL('http://localhost/auth/callback?code=authcode&state=badstate');

		const response = await GET({
			url,
			cookies
		} as any);

		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Authentication failed');
	});

	it('handles OAuth error parameter', async () => {
		const { GET } = await import('./+server');

		const cookies = createMockCookies();
		const url = new URL(
			'http://localhost/auth/callback?error=access_denied&error_description=User+denied+access'
		);

		const response = await GET({
			url,
			cookies
		} as any);

		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('access_denied');
		expect(body.error_description).toBe('User denied access');
	});

	it('stores session with correct user data', async () => {
		const mockSession = {
			did: 'did:plc:abc123'
		};
		mockCallback.mockResolvedValue({ session: mockSession });
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ handle: 'myuser.bsky.social' })
		});

		const { GET } = await import('./+server');

		const cookies = createMockCookies();
		const url = new URL('http://localhost/auth/callback?code=authcode&state=teststate');

		await GET({
			url,
			cookies
		} as any);

		// Verify session was created with correct data
		expect(cookies.set).toHaveBeenCalledWith(
			'bts_session',
			expect.any(String),
			expect.objectContaining({
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax'
			})
		);
	});

	it('falls back to DID if handle resolution fails', async () => {
		const mockSession = {
			did: 'did:plc:fallback123'
		};
		mockCallback.mockResolvedValue({ session: mockSession });
		mockFetch.mockResolvedValue({ ok: false });

		const { GET } = await import('./+server');

		const cookies = createMockCookies();
		const url = new URL('http://localhost/auth/callback?code=authcode&state=teststate');

		const response = await GET({
			url,
			cookies
		} as any);

		expect(response.status).toBe(302);
		expect(cookies.set).toHaveBeenCalled();
	});
});
