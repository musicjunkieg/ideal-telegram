import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createSession,
	getSession,
	destroySession,
	refreshSession,
	shouldRefreshSession,
	SESSION_COOKIE_NAME,
	SESSION_DURATION,
	REFRESH_THRESHOLD
} from './cookies';
import { generateEncryptionKey } from './encryption';
import type { Session } from '$lib/types';
import type { Cookies } from '@sveltejs/kit';

// Mock SvelteKit Cookies interface
function createMockCookies(): Cookies & { store: Map<string, string> } {
	const store = new Map<string, string>();
	return {
		store,
		get: vi.fn((name: string) => store.get(name)),
		getAll: vi.fn(() => Array.from(store.entries()).map(([name, value]) => ({ name, value }))),
		set: vi.fn((name: string, value: string) => {
			store.set(name, value);
		}),
		delete: vi.fn((name: string) => {
			store.delete(name);
		}),
		serialize: vi.fn(() => '')
	};
}

describe('Cookie Session Management', () => {
	let mockCookies: ReturnType<typeof createMockCookies>;
	let encryptionKey: string;

	beforeEach(() => {
		mockCookies = createMockCookies();
		encryptionKey = generateEncryptionKey();
	});

	describe('createSession', () => {
		it('sets an encrypted session cookie', () => {
			const session: Session = {
				did: 'did:plc:test123',
				handle: 'testuser.bsky.social',
				expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
			};

			createSession(mockCookies, session, encryptionKey);

			expect(mockCookies.set).toHaveBeenCalledWith(
				SESSION_COOKIE_NAME,
				expect.any(String),
				expect.objectContaining({
					path: '/',
					httpOnly: true,
					secure: true,
					sameSite: 'lax'
				})
			);
		});

		it('sets cookie with correct maxAge based on session expiration', () => {
			const expiresAt = Date.now() + 3600000; // 1 hour from now
			const session: Session = {
				did: 'did:plc:test123',
				handle: 'testuser.bsky.social',
				expiresAt
			};

			createSession(mockCookies, session, encryptionKey);

			const setCall = vi.mocked(mockCookies.set).mock.calls[0];
			const options = setCall[2] as { maxAge: number };
			// maxAge should be approximately 3600 seconds (within 2 seconds tolerance for test timing)
			expect(options.maxAge).toBeGreaterThan(3598);
			expect(options.maxAge).toBeLessThanOrEqual(3600);
		});
	});

	describe('getSession', () => {
		it('returns session from valid encrypted cookie', () => {
			const session: Session = {
				did: 'did:plc:abc123',
				handle: 'user.bsky.social',
				expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
			};

			createSession(mockCookies, session, encryptionKey);
			const retrieved = getSession(mockCookies, encryptionKey);

			expect(retrieved).toEqual(session);
		});

		it('returns null when no session cookie exists', () => {
			const session = getSession(mockCookies, encryptionKey);
			expect(session).toBeNull();
		});

		it('returns null for expired session', () => {
			const session: Session = {
				did: 'did:plc:expired',
				handle: 'expired.bsky.social',
				expiresAt: Date.now() - 1000 // Expired 1 second ago
			};

			createSession(mockCookies, session, encryptionKey);
			const retrieved = getSession(mockCookies, encryptionKey);

			expect(retrieved).toBeNull();
		});

		it('returns null for tampered cookie', () => {
			const session: Session = {
				did: 'did:plc:test',
				handle: 'test.bsky.social',
				expiresAt: Date.now() + 3600000
			};

			createSession(mockCookies, session, encryptionKey);
			// Tamper with the cookie
			const cookieValue = mockCookies.store.get(SESSION_COOKIE_NAME)!;
			mockCookies.store.set(SESSION_COOKIE_NAME, 'tampered' + cookieValue.slice(8));

			const retrieved = getSession(mockCookies, encryptionKey);
			expect(retrieved).toBeNull();
		});

		it('returns null for wrong encryption key', () => {
			const session: Session = {
				did: 'did:plc:test',
				handle: 'test.bsky.social',
				expiresAt: Date.now() + 3600000
			};

			createSession(mockCookies, session, encryptionKey);
			const wrongKey = generateEncryptionKey();
			const retrieved = getSession(mockCookies, wrongKey);

			expect(retrieved).toBeNull();
		});
	});

	describe('destroySession', () => {
		it('deletes the session cookie', () => {
			const session: Session = {
				did: 'did:plc:test',
				handle: 'test.bsky.social',
				expiresAt: Date.now() + 3600000
			};

			createSession(mockCookies, session, encryptionKey);
			destroySession(mockCookies);

			expect(mockCookies.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME, { path: '/' });
		});
	});

	describe('SESSION_COOKIE_NAME', () => {
		it('is a descriptive name', () => {
			expect(SESSION_COOKIE_NAME).toBe('bts_session');
		});
	});

	describe('SESSION_DURATION', () => {
		it('is 7 days in milliseconds', () => {
			expect(SESSION_DURATION).toBe(7 * 24 * 60 * 60 * 1000);
		});
	});

	describe('REFRESH_THRESHOLD', () => {
		it('is 1 day in milliseconds', () => {
			expect(REFRESH_THRESHOLD).toBe(24 * 60 * 60 * 1000);
		});
	});

	describe('shouldRefreshSession', () => {
		it('returns true when session expires within threshold', () => {
			const session: Session = {
				did: 'did:plc:test',
				handle: 'test.bsky.social',
				expiresAt: Date.now() + 12 * 60 * 60 * 1000 // 12 hours from now
			};

			expect(shouldRefreshSession(session)).toBe(true);
		});

		it('returns false when session has plenty of time left', () => {
			const session: Session = {
				did: 'did:plc:test',
				handle: 'test.bsky.social',
				expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000 // 5 days from now
			};

			expect(shouldRefreshSession(session)).toBe(false);
		});

		it('returns false for expired session', () => {
			const session: Session = {
				did: 'did:plc:test',
				handle: 'test.bsky.social',
				expiresAt: Date.now() - 1000 // Expired
			};

			expect(shouldRefreshSession(session)).toBe(false);
		});
	});

	describe('refreshSession', () => {
		it('extends session expiration and updates cookie', () => {
			const originalExpiry = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
			const session: Session = {
				did: 'did:plc:refresh',
				handle: 'refresh.bsky.social',
				expiresAt: originalExpiry
			};

			createSession(mockCookies, session, encryptionKey);
			const refreshed = refreshSession(mockCookies, session, encryptionKey);

			expect(refreshed).not.toBeNull();
			expect(refreshed!.did).toBe(session.did);
			expect(refreshed!.handle).toBe(session.handle);
			expect(refreshed!.expiresAt).toBeGreaterThan(originalExpiry);
			// New expiration should be ~7 days from now
			expect(refreshed!.expiresAt).toBeGreaterThan(Date.now() + SESSION_DURATION - 1000);
		});

		it('preserves user identity when refreshing', () => {
			const session: Session = {
				did: 'did:plc:identity',
				handle: 'identity.bsky.social',
				expiresAt: Date.now() + 6 * 60 * 60 * 1000 // 6 hours
			};

			createSession(mockCookies, session, encryptionKey);
			const refreshed = refreshSession(mockCookies, session, encryptionKey);

			expect(refreshed?.did).toBe(session.did);
			expect(refreshed?.handle).toBe(session.handle);
		});
	});
});
