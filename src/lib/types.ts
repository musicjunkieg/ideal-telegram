/**
 * Session and authentication types for Bluesky Toxicity Shield
 */

/**
 * User session data stored in encrypted cookies
 */
export interface Session {
	/** User's decentralized identifier (DID) */
	did: string;
	/** User's Bluesky handle */
	handle: string;
	/** Session expiration timestamp (Unix ms) */
	expiresAt: number;
}

/**
 * Encrypted session payload stored in cookie
 */
export interface EncryptedSession {
	/** Initialization vector for AES-GCM (base64) */
	iv: string;
	/** Encrypted session data (base64) */
	data: string;
	/** Authentication tag (base64) */
	tag: string;
}

/**
 * Session configuration options
 */
export interface SessionConfig {
	/** Session duration in milliseconds (default: 7 days) */
	maxAge?: number;
	/** Cookie name (default: 'session') */
	cookieName?: string;
	/** Encryption key (32 bytes for AES-256) */
	encryptionKey: string;
}

/**
 * User data available in App.Locals after authentication
 */
export interface User {
	did: string;
	handle: string;
}
