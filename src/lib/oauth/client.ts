import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { MemoryStateStore, MemorySessionStore } from './stores';

// Module-level client instance and config
let oauthClient: NodeOAuthClient | null = null;
let currentClientId: string | null = null;

export interface CreateOAuthClientOptions {
	clientId: string;
	stateStore?: MemoryStateStore;
	sessionStore?: MemorySessionStore;
}

/**
 * Create and configure the OAuth client for AT Protocol authentication
 */
export async function createOAuthClient(
	options: CreateOAuthClientOptions
): Promise<NodeOAuthClient> {
	const { clientId, stateStore = new MemoryStateStore(), sessionStore = new MemorySessionStore() } =
		options;

	currentClientId = clientId;

	oauthClient = new NodeOAuthClient({
		clientMetadata: {
			client_id: clientId,
			client_name: 'Bluesky Toxicity Shield',
			client_uri: clientId.replace('/client-metadata.json', ''),
			redirect_uris: [clientId.replace('/client-metadata.json', '/auth/callback')],
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code'],
			scope: 'atproto transition:generic',
			token_endpoint_auth_method: 'none',
			dpop_bound_access_tokens: true,
			application_type: 'web'
		},
		stateStore,
		sessionStore
	});

	return oauthClient;
}

/**
 * Get the current client ID
 */
export function getClientId(): string | null {
	return currentClientId;
}

/**
 * Get the current OAuth client instance
 * @throws Error if client has not been initialized
 */
export function getOAuthClient(): NodeOAuthClient {
	if (!oauthClient) {
		throw new Error('OAuth client not initialized. Call createOAuthClient first.');
	}
	return oauthClient;
}
