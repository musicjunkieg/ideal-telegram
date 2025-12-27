import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';
import type { Session } from '$lib/types';
import { encryptSession } from '$lib/session/encryption';

// Test encryption key (valid 32-byte base64 encoded)
const TEST_SESSION_SECRET = '0uNTnZMGtmCICdv/NYubOJEvZQ1LPrlvsQOHmWnzz+E=';

// Mock environment with valid 32-byte key (base64 encoded)
vi.mock('$env/static/private', () => ({
	SESSION_SECRET: '0uNTnZMGtmCICdv/NYubOJEvZQ1LPrlvsQOHmWnzz+E='
}));

// Import after mock is set up
const { handle } = await import('./hooks.server');

// Type for resolve function
type ResolveFn = (event: RequestEvent, opts?: ResolveOptions) => Response | Promise<Response>;

// Helper to create mock RequestEvent
function createMockEvent(overrides: Partial<RequestEvent> = {}): RequestEvent {
	const cookies = new Map<string, string>();
	return {
		cookies: {
			get: vi.fn((name: string) => cookies.get(name)),
			getAll: vi.fn(() => Array.from(cookies.entries()).map(([name, value]) => ({ name, value }))),
			set: vi.fn((name: string, value: string) => cookies.set(name, value)),
			delete: vi.fn((name: string) => cookies.delete(name)),
			serialize: vi.fn(() => '')
		},
		locals: {} as App.Locals,
		request: new Request('http://localhost/'),
		url: new URL('http://localhost/'),
		params: {},
		route: { id: '/' },
		fetch: vi.fn(),
		getClientAddress: vi.fn(() => '127.0.0.1'),
		platform: undefined,
		isDataRequest: false,
		isSubRequest: false,
		...overrides
	} as unknown as RequestEvent;
}

describe('hooks.server.ts', () => {
	let mockResolve: ResolveFn;

	beforeEach(() => {
		vi.clearAllMocks();
		mockResolve = vi.fn().mockResolvedValue(new Response('OK')) as unknown as ResolveFn;
	});

	describe('handle', () => {
		it('sets locals.user to null when no session cookie exists', async () => {
			const event = createMockEvent();

			await handle({ event, resolve: mockResolve });

			expect(event.locals.user).toBeNull();
			expect(mockResolve).toHaveBeenCalledWith(event);
		});

		it('sets locals.user from valid session cookie', async () => {
			const event = createMockEvent();
			const session: Session = {
				did: 'did:plc:testuser',
				handle: 'testuser.bsky.social',
				expiresAt: Date.now() + 3600000
			};

			const encrypted = encryptSession(session, TEST_SESSION_SECRET);
			const cookieValue = JSON.stringify(encrypted);

			vi.mocked(event.cookies.get).mockReturnValue(cookieValue);

			await handle({ event, resolve: mockResolve });

			expect(event.locals.user).toEqual({
				did: session.did,
				handle: session.handle
			});
		});

		it('sets locals.user to null for expired session', async () => {
			const event = createMockEvent();
			const session: Session = {
				did: 'did:plc:expired',
				handle: 'expired.bsky.social',
				expiresAt: Date.now() - 1000 // Expired
			};

			const encrypted = encryptSession(session, TEST_SESSION_SECRET);
			const cookieValue = JSON.stringify(encrypted);

			vi.mocked(event.cookies.get).mockReturnValue(cookieValue);

			await handle({ event, resolve: mockResolve });

			expect(event.locals.user).toBeNull();
		});

		it('sets locals.user to null for tampered cookie', async () => {
			const event = createMockEvent();
			vi.mocked(event.cookies.get).mockReturnValue('invalid-cookie-data');

			await handle({ event, resolve: mockResolve });

			expect(event.locals.user).toBeNull();
		});

		it('calls resolve with the event', async () => {
			const event = createMockEvent();
			const mockResponse = new Response('test');
			mockResolve = vi.fn().mockResolvedValue(mockResponse) as unknown as ResolveFn;

			const result = await handle({ event, resolve: mockResolve });

			expect(mockResolve).toHaveBeenCalledWith(event);
			expect(result).toBe(mockResponse);
		});

		it('refreshes session when close to expiration', async () => {
			const event = createMockEvent();
			const session: Session = {
				did: 'did:plc:refresh',
				handle: 'refresh.bsky.social',
				expiresAt: Date.now() + 12 * 60 * 60 * 1000 // 12 hours (within 1-day threshold)
			};

			const encrypted = encryptSession(session, TEST_SESSION_SECRET);
			const cookieValue = JSON.stringify(encrypted);

			vi.mocked(event.cookies.get).mockReturnValue(cookieValue);

			await handle({ event, resolve: mockResolve });

			// Session should be refreshed (new cookie set)
			expect(event.cookies.set).toHaveBeenCalled();
			expect(event.locals.user).toEqual({
				did: session.did,
				handle: session.handle
			});
		});

		it('does not refresh session with plenty of time left', async () => {
			const event = createMockEvent();
			const session: Session = {
				did: 'did:plc:norefresh',
				handle: 'norefresh.bsky.social',
				expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000 // 5 days
			};

			const encrypted = encryptSession(session, TEST_SESSION_SECRET);
			const cookieValue = JSON.stringify(encrypted);

			vi.mocked(event.cookies.get).mockReturnValue(cookieValue);

			await handle({ event, resolve: mockResolve });

			// Session should NOT be refreshed
			expect(event.cookies.set).not.toHaveBeenCalled();
			expect(event.locals.user).toEqual({
				did: session.did,
				handle: session.handle
			});
		});
	});
});
