import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import type { Session, EncryptedSession } from '$lib/types';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits

/**
 * Generate a cryptographically secure encryption key for AES-256
 * @returns Base64-encoded 32-byte key
 */
export function generateEncryptionKey(): string {
	return randomBytes(32).toString('base64');
}

/**
 * Encrypt a session object using AES-256-GCM
 * @param session - The session to encrypt
 * @param key - Base64-encoded 32-byte encryption key
 * @returns Encrypted session with IV, ciphertext, and auth tag
 */
export function encryptSession(session: Session, key: string): EncryptedSession {
	const keyBuffer = Buffer.from(key, 'base64');
	if (keyBuffer.length !== 32) {
		throw new Error('Encryption key must be 32 bytes (256 bits)');
	}

	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: TAG_LENGTH });

	const plaintext = JSON.stringify(session);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();

	return {
		iv: iv.toString('base64'),
		data: encrypted.toString('base64'),
		tag: tag.toString('base64')
	};
}

/**
 * Decrypt an encrypted session using AES-256-GCM
 * @param encrypted - The encrypted session object
 * @param key - Base64-encoded 32-byte encryption key
 * @returns Decrypted session or null if decryption fails
 */
export function decryptSession(encrypted: EncryptedSession, key: string): Session | null {
	try {
		const keyBuffer = Buffer.from(key, 'base64');
		if (keyBuffer.length !== 32) {
			return null;
		}

		const iv = Buffer.from(encrypted.iv, 'base64');
		const data = Buffer.from(encrypted.data, 'base64');
		const tag = Buffer.from(encrypted.tag, 'base64');

		const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: TAG_LENGTH });
		decipher.setAuthTag(tag);

		const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
		return JSON.parse(decrypted.toString('utf8')) as Session;
	} catch {
		// Decryption failed (tampered data, wrong key, etc.)
		return null;
	}
}
