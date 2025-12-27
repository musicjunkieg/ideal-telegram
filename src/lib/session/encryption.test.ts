import { describe, it, expect, beforeEach } from 'vitest';
import { encryptSession, decryptSession, generateEncryptionKey } from './encryption';
import type { Session } from '$lib/types';

describe('Session Encryption', () => {
	let testKey: string;
	let testSession: Session;

	beforeEach(() => {
		testKey = generateEncryptionKey();
		testSession = {
			did: 'did:plc:abc123',
			handle: 'testuser.bsky.social',
			expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
		};
	});

	describe('generateEncryptionKey', () => {
		it('generates a 32-byte key encoded as base64', () => {
			const key = generateEncryptionKey();
			const decoded = Buffer.from(key, 'base64');
			expect(decoded.length).toBe(32);
		});

		it('generates unique keys each time', () => {
			const key1 = generateEncryptionKey();
			const key2 = generateEncryptionKey();
			expect(key1).not.toBe(key2);
		});
	});

	describe('encryptSession', () => {
		it('returns an encrypted session object with iv, data, and tag', () => {
			const encrypted = encryptSession(testSession, testKey);
			expect(encrypted).toHaveProperty('iv');
			expect(encrypted).toHaveProperty('data');
			expect(encrypted).toHaveProperty('tag');
		});

		it('produces different ciphertext for same input (due to random IV)', () => {
			const encrypted1 = encryptSession(testSession, testKey);
			const encrypted2 = encryptSession(testSession, testKey);
			expect(encrypted1.data).not.toBe(encrypted2.data);
			expect(encrypted1.iv).not.toBe(encrypted2.iv);
		});

		it('throws error for invalid key', () => {
			expect(() => encryptSession(testSession, 'invalid-key')).toThrow();
		});
	});

	describe('decryptSession', () => {
		it('decrypts an encrypted session back to original', () => {
			const encrypted = encryptSession(testSession, testKey);
			const decrypted = decryptSession(encrypted, testKey);
			expect(decrypted).toEqual(testSession);
		});

		it('returns null for tampered ciphertext', () => {
			const encrypted = encryptSession(testSession, testKey);
			encrypted.data = 'tampered' + encrypted.data.slice(8);
			const decrypted = decryptSession(encrypted, testKey);
			expect(decrypted).toBeNull();
		});

		it('returns null for wrong key', () => {
			const encrypted = encryptSession(testSession, testKey);
			const wrongKey = generateEncryptionKey();
			const decrypted = decryptSession(encrypted, wrongKey);
			expect(decrypted).toBeNull();
		});

		it('returns null for invalid encrypted session format', () => {
			const decrypted = decryptSession({ iv: 'bad', data: 'bad', tag: 'bad' }, testKey);
			expect(decrypted).toBeNull();
		});
	});

	describe('round-trip', () => {
		it('preserves all session fields through encrypt/decrypt cycle', () => {
			const session: Session = {
				did: 'did:plc:xyz789',
				handle: 'anotheruser.bsky.social',
				expiresAt: 1735689600000 // Fixed timestamp
			};
			const encrypted = encryptSession(session, testKey);
			const decrypted = decryptSession(encrypted, testKey);
			expect(decrypted?.did).toBe(session.did);
			expect(decrypted?.handle).toBe(session.handle);
			expect(decrypted?.expiresAt).toBe(session.expiresAt);
		});
	});
});
