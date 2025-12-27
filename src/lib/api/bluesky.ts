/**
 * Bluesky API client for authenticated requests
 *
 * Wraps @atproto/api with retry logic and integrates with OAuth sessions.
 */

import { Agent } from '@atproto/api';
import { getOAuthClient } from '$lib/oauth/client';
import { withRetry } from './retry';

/**
 * Get an authenticated AT Protocol agent for a user
 *
 * @param did - User's decentralized identifier
 * @returns Agent instance for making authenticated API calls
 * @throws Error if no OAuth session exists for the user
 */
export async function getAuthenticatedAgent(did: string): Promise<Agent> {
	const client = getOAuthClient();
	const session = await client.restore(did);

	if (!session) {
		throw new Error(`No OAuth session found for DID: ${did}`);
	}

	return new Agent(session);
}

/**
 * Get a user's profile
 *
 * @param did - The authenticated user's DID (for session lookup)
 * @param actor - The DID or handle of the profile to fetch (defaults to authenticated user)
 * @returns The profile data
 */
export async function getProfile(did: string, actor?: string) {
	const agent = await getAuthenticatedAgent(did);
	return withRetry(() => agent.getProfile({ actor: actor ?? did }));
}

/**
 * Get a user's post feed
 *
 * @param did - The authenticated user's DID (for session lookup)
 * @param actor - The DID or handle of the feed to fetch (defaults to authenticated user)
 * @param limit - Maximum number of posts to return (default: 50)
 * @returns The feed data including posts
 */
export async function getAuthorFeed(did: string, actor?: string, limit = 50) {
	const agent = await getAuthenticatedAgent(did);
	return withRetry(() =>
		agent.getAuthorFeed({
			actor: actor ?? did,
			limit
		})
	);
}
