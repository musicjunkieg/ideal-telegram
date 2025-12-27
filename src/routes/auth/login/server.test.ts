/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the OAuth client
const mockAuthorize = vi.fn();
vi.mock('$lib/oauth/client', () => ({
	getOAuthClient: vi.fn(() => ({
		authorize: mockAuthorize
	})),
	createOAuthClient: vi.fn()
}));

describe('GET /auth/login', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects to OAuth authorization URL when handle is provided', async () => {
		const authUrl = new URL('https://bsky.social/oauth/authorize?state=test123');
		mockAuthorize.mockResolvedValue(authUrl);

		const { GET } = await import('./+server');

		const url = new URL('http://localhost/auth/login?handle=test.bsky.social');
		const response = await GET({
			url,
			cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe(authUrl.toString());
		expect(mockAuthorize).toHaveBeenCalledWith('test.bsky.social', {
			scope: 'atproto transition:generic'
		});
	});

	it('returns 400 when handle is missing', async () => {
		const { GET } = await import('./+server');

		const url = new URL('http://localhost/auth/login');
		const response = await GET({
			url,
			cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
		} as any);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Handle is required');
	});

	it('returns 400 when handle is empty', async () => {
		const { GET } = await import('./+server');

		const url = new URL('http://localhost/auth/login?handle=');
		const response = await GET({
			url,
			cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
		} as any);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Handle is required');
	});

	it('returns 500 when OAuth authorization fails', async () => {
		mockAuthorize.mockRejectedValue(new Error('OAuth error'));

		const { GET } = await import('./+server');

		const url = new URL('http://localhost/auth/login?handle=test.bsky.social');
		const response = await GET({
			url,
			cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
		} as any);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error).toBe('Failed to initiate OAuth');
	});
});

describe('POST /auth/login', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects to OAuth authorization URL when handle is in form body', async () => {
		const authUrl = new URL('https://bsky.social/oauth/authorize?state=test123');
		mockAuthorize.mockResolvedValue(authUrl);

		const { POST } = await import('./+server');

		const formData = new FormData();
		formData.append('handle', 'user.bsky.social');

		const request = new Request('http://localhost/auth/login', {
			method: 'POST',
			body: formData
		});

		const response = await POST({
			request,
			url: new URL('http://localhost/auth/login'),
			cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
		} as any);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe(authUrl.toString());
		expect(mockAuthorize).toHaveBeenCalledWith('user.bsky.social', {
			scope: 'atproto transition:generic'
		});
	});

	it('returns 400 when handle is missing from form', async () => {
		const { POST } = await import('./+server');

		const formData = new FormData();

		const request = new Request('http://localhost/auth/login', {
			method: 'POST',
			body: formData
		});

		const response = await POST({
			request,
			url: new URL('http://localhost/auth/login'),
			cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
		} as any);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Handle is required');
	});
});
