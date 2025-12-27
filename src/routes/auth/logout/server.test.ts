/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Cookies } from '@sveltejs/kit';

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

	it('destroys session and redirects to home', async () => {
		const { POST } = await import('./+server');

		const cookies = createMockCookies();
		// Simulate having a session
		cookies.store.set('bts_session', 'some-encrypted-session');

		const response = await POST({
			cookies
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
		expect(cookies.delete).toHaveBeenCalledWith('bts_session', { path: '/' });
	});

	it('redirects to home even when no session exists', async () => {
		const { POST } = await import('./+server');

		const cookies = createMockCookies();

		const response = await POST({
			cookies
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
		expect(cookies.delete).toHaveBeenCalledWith('bts_session', { path: '/' });
	});
});

describe('GET /auth/logout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('destroys session and redirects to home', async () => {
		const { GET } = await import('./+server');

		const cookies = createMockCookies();
		cookies.store.set('bts_session', 'some-encrypted-session');

		const response = await GET({
			cookies
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
		expect(cookies.delete).toHaveBeenCalledWith('bts_session', { path: '/' });
	});
});
