import Redis from 'ioredis';
import type { NodeSavedSession, NodeSavedState } from '@atproto/oauth-client-node';
import type { SimpleStore } from '@atproto-labs/simple-store';

const SESSION_KEY_PREFIX = 'oauth:session:';
const STATE_KEY_PREFIX = 'oauth:state:';
const DEFAULT_SESSION_TTL = 86400; // 24 hours
const STATE_TTL = 600; // 10 minutes for OAuth state

/**
 * Redis-backed store for OAuth sessions.
 * Persists sessions across server restarts.
 */
export class RedisSessionStore implements SimpleStore<string, NodeSavedSession> {
	constructor(private readonly redis: Redis) {}

	async get(key: string): Promise<NodeSavedSession | undefined> {
		try {
			const data = await this.redis.get(`${SESSION_KEY_PREFIX}${key}`);
			if (!data) return undefined;
			return JSON.parse(data) as NodeSavedSession;
		} catch {
			// Invalid JSON or Redis error
			return undefined;
		}
	}

	async set(key: string, value: NodeSavedSession): Promise<void> {
		const ttl = this.calculateTTL(value);
		await this.redis.set(`${SESSION_KEY_PREFIX}${key}`, JSON.stringify(value), 'EX', ttl);
	}

	async del(key: string): Promise<void> {
		await this.redis.del(`${SESSION_KEY_PREFIX}${key}`);
	}

	/**
	 * Calculate TTL based on token expiration time.
	 * Falls back to default if no expiration is set.
	 */
	private calculateTTL(session: NodeSavedSession): number {
		const expiresAt = session.tokenSet?.expires_at;
		if (!expiresAt) return DEFAULT_SESSION_TTL;

		// expires_at is an ISO date string
		const expiresAtMs = new Date(expiresAt).getTime();
		const ttlMs = expiresAtMs - Date.now();
		if (ttlMs <= 0) return DEFAULT_SESSION_TTL;

		return Math.ceil(ttlMs / 1000);
	}
}

/**
 * Redis-backed store for OAuth state (PKCE verifiers, etc.).
 * Short-lived entries that expire after the OAuth flow completes.
 */
export class RedisStateStore implements SimpleStore<string, NodeSavedState> {
	constructor(private readonly redis: Redis) {}

	async get(key: string): Promise<NodeSavedState | undefined> {
		try {
			const data = await this.redis.get(`${STATE_KEY_PREFIX}${key}`);
			if (!data) return undefined;
			return JSON.parse(data) as NodeSavedState;
		} catch {
			// Invalid JSON or Redis error
			return undefined;
		}
	}

	async set(key: string, value: NodeSavedState): Promise<void> {
		await this.redis.set(`${STATE_KEY_PREFIX}${key}`, JSON.stringify(value), 'EX', STATE_TTL);
	}

	async del(key: string): Promise<void> {
		await this.redis.del(`${STATE_KEY_PREFIX}${key}`);
	}
}

export interface RedisStores {
	sessionStore: RedisSessionStore;
	stateStore: RedisStateStore;
	redis: Redis;
}

/**
 * Create both Redis-backed stores from a Redis instance or URL.
 */
export function createRedisStores(redisOrUrl: Redis | string): RedisStores {
	const redis = typeof redisOrUrl === 'string' ? new Redis(redisOrUrl) : redisOrUrl;

	return {
		sessionStore: new RedisSessionStore(redis),
		stateStore: new RedisStateStore(redis),
		redis
	};
}
