import type { NodeSavedState, NodeSavedSession } from '@atproto/oauth-client-node';

/**
 * In-memory store for OAuth state (PKCE, etc.)
 * For production, consider using Redis or database storage
 */
export class MemoryStateStore {
	private store = new Map<string, NodeSavedState>();

	async set(key: string, value: NodeSavedState): Promise<void> {
		this.store.set(key, value);
	}

	async get(key: string): Promise<NodeSavedState | undefined> {
		return this.store.get(key);
	}

	async del(key: string): Promise<void> {
		this.store.delete(key);
	}
}

/**
 * In-memory store for OAuth sessions
 * For production, consider using Redis or database storage
 */
export class MemorySessionStore {
	private store = new Map<string, NodeSavedSession>();

	async set(sub: string, value: NodeSavedSession): Promise<void> {
		this.store.set(sub, value);
	}

	async get(sub: string): Promise<NodeSavedSession | undefined> {
		return this.store.get(sub);
	}

	async del(sub: string): Promise<void> {
		this.store.delete(sub);
	}
}
