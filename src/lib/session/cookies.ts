import type { Cookies } from '@sveltejs/kit';
import type { Session, EncryptedSession } from '$lib/types';
import { encryptSession, decryptSession } from './encryption';

export const SESSION_COOKIE_NAME = 'bts_session';

/** Default session duration: 7 days in milliseconds */
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

/** Refresh threshold: refresh if session expires within 1 day */
export const REFRESH_THRESHOLD = 24 * 60 * 60 * 1000;

/**
 * Create a new session by setting an encrypted cookie
 * @param cookies - SvelteKit cookies object
 * @param session - Session data to store
 * @param encryptionKey - Base64-encoded 32-byte encryption key
 */
export function createSession(cookies: Cookies, session: Session, encryptionKey: string): void {
	const encrypted = encryptSession(session, encryptionKey);
	const cookieValue = JSON.stringify(encrypted);

	// Calculate maxAge in seconds from session expiration
	const maxAge = Math.floor((session.expiresAt - Date.now()) / 1000);

	cookies.set(SESSION_COOKIE_NAME, cookieValue, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge
	});
}

/**
 * Get the current session from cookies
 * @param cookies - SvelteKit cookies object
 * @param encryptionKey - Base64-encoded 32-byte encryption key
 * @returns Session if valid and not expired, null otherwise
 */
export function getSession(cookies: Cookies, encryptionKey: string): Session | null {
	const cookieValue = cookies.get(SESSION_COOKIE_NAME);
	if (!cookieValue) {
		return null;
	}

	try {
		const encrypted: EncryptedSession = JSON.parse(cookieValue);
		const session = decryptSession(encrypted, encryptionKey);

		if (!session) {
			return null;
		}

		// Check if session is expired
		if (session.expiresAt < Date.now()) {
			return null;
		}

		return session;
	} catch {
		// Invalid cookie format
		return null;
	}
}

/**
 * Destroy the current session by deleting the cookie
 * @param cookies - SvelteKit cookies object
 */
export function destroySession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

/**
 * Check if a session should be refreshed (close to expiration)
 * @param session - The session to check
 * @returns true if session should be refreshed
 */
export function shouldRefreshSession(session: Session): boolean {
	const timeRemaining = session.expiresAt - Date.now();
	// Only refresh if session is valid (not expired) and within threshold
	return timeRemaining > 0 && timeRemaining < REFRESH_THRESHOLD;
}

/**
 * Refresh a session by extending its expiration
 * @param cookies - SvelteKit cookies object
 * @param session - The current session to refresh
 * @param encryptionKey - Base64-encoded 32-byte encryption key
 * @returns The refreshed session, or null if refresh failed
 */
export function refreshSession(
	cookies: Cookies,
	session: Session,
	encryptionKey: string
): Session | null {
	const refreshedSession: Session = {
		...session,
		expiresAt: Date.now() + SESSION_DURATION
	};

	createSession(cookies, refreshedSession, encryptionKey);
	return refreshedSession;
}
