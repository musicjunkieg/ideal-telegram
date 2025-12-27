import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';

// Mock the $env/dynamic/public module
vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_APP_URL: undefined
	}
}));

describe('GET /client-metadata.json', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns valid OAuth client metadata', async () => {
		const mockUrl = new URL('http://localhost:5173/client-metadata.json');
		const mockRequest = {
			url: mockUrl
		} as Parameters<typeof GET>[0];

		const response = await GET(mockRequest);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.client_name).toBe('Bluesky Toxicity Shield');
	});

	it('sets client_id to match the request URL', async () => {
		const mockUrl = new URL('http://localhost:5173/client-metadata.json');
		const mockRequest = {
			url: mockUrl
		} as Parameters<typeof GET>[0];

		const response = await GET(mockRequest);
		const data = await response.json();

		expect(data.client_id).toBe('http://localhost:5173/client-metadata.json');
	});

	it('includes all required AT Protocol OAuth fields', async () => {
		const mockUrl = new URL('http://localhost:5173/client-metadata.json');
		const mockRequest = {
			url: mockUrl
		} as Parameters<typeof GET>[0];

		const response = await GET(mockRequest);
		const data = await response.json();

		// Required fields per AT Protocol OAuth spec
		expect(data.dpop_bound_access_tokens).toBe(true);
		expect(data.grant_types).toContain('authorization_code');
		expect(data.response_types).toContain('code');
		expect(data.scope).toContain('atproto');
		expect(data.redirect_uris).toHaveLength(1);
		expect(data.redirect_uris[0]).toBe('http://localhost:5173/auth/callback');
	});

	it('sets token_endpoint_auth_method to none for public client', async () => {
		const mockUrl = new URL('http://localhost:5173/client-metadata.json');
		const mockRequest = {
			url: mockUrl
		} as Parameters<typeof GET>[0];

		const response = await GET(mockRequest);
		const data = await response.json();

		expect(data.token_endpoint_auth_method).toBe('none');
	});

	it('sets Cache-Control header', async () => {
		const mockUrl = new URL('http://localhost:5173/client-metadata.json');
		const mockRequest = {
			url: mockUrl
		} as Parameters<typeof GET>[0];

		const response = await GET(mockRequest);

		expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
	});
});
