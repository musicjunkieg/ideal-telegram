/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Cookies } from '@sveltejs/kit';

// Mock the OAuth client
const mockRevoke = vi.fn();
vi.mock('$lib/oauth/client', () => ({
	getOAuthClient: vi.fn(() => ({
		revoke: mockRevoke
	}))
}));

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

describe('POST /auth/logout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('revokes OAuth tokens and destroys session when user is logged in', async () => {
		const { POST } = await import('./+server');

		const cookies = createMockCookies();
		cookies.store.set('bts_session', 'some-encrypted-session');

		const locals = {
			user: { did: 'did:plc:testuser123', handle: 'testuser.bsky.social' }
		};

		mockRevoke.mockResolvedValue(undefined);

		const response = await POST({
			cookies,
			locals
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
		expect(mockRevoke).toHaveBeenCalledWith('did:plc:testuser123');
		expect(cookies.delete).toHaveBeenCalledWith('bts_session', { path: '/' });
	});

	it('still destroys session if token revocation fails', async () => {
		const { POST } = await import('./+server');

		const cookies = createMockCookies();
		cookies.store.set('bts_session', 'some-encrypted-session');

		const locals = {
			user: { did: 'did:plc:testuser123', handle: 'testuser.bsky.social' }
		};

		mockRevoke.mockRejectedValue(new Error('Revocation failed'));

		const response = await POST({
			cookies,
			locals
		} as any);

		// Should still redirect successfully even if revocation fails
		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
		expect(cookies.delete).toHaveBeenCalledWith('bts_session', { path: '/' });
	});

	it('skips revocation when no user in session', async () => {
		const { POST } = await import('./+server');

		const cookies = createMockCookies();

		const locals = {
			user: null
		};

		const response = await POST({
			cookies,
			locals
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
		expect(mockRevoke).not.toHaveBeenCalled();
		expect(cookies.delete).toHaveBeenCalledWith('bts_session', { path: '/' });
	});
});

describe('GET /auth/logout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('revokes OAuth tokens and destroys session', async () => {
		const { GET } = await import('./+server');

		const cookies = createMockCookies();
		cookies.store.set('bts_session', 'some-encrypted-session');

		const locals = {
			user: { did: 'did:plc:user456', handle: 'user.bsky.social' }
		};

		mockRevoke.mockResolvedValue(undefined);

		const response = await GET({
			cookies,
			locals
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
		expect(mockRevoke).toHaveBeenCalledWith('did:plc:user456');
		expect(cookies.delete).toHaveBeenCalledWith('bts_session', { path: '/' });
	});

	it('handles logout when no user is logged in', async () => {
		const { GET } = await import('./+server');

		const cookies = createMockCookies();

		const locals = {
			user: null
		};

		const response = await GET({
			cookies,
			locals
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
		expect(mockRevoke).not.toHaveBeenCalled();
	});
});
