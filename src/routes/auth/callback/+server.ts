import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/oauth/client';
import { createSession, SESSION_DURATION } from '$lib/session';
import { SESSION_SECRET } from '$env/static/private';

/**
 * Resolve a user's handle from their DID using the Bluesky API
 */
async function resolveHandle(did: string): Promise<string> {
	try {
		const response = await fetch(
			`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
		);
		if (response.ok) {
			const profile = await response.json();
			return profile.handle || did;
		}
	} catch {
		// Fall back to DID if handle resolution fails
	}
	return did;
}

/**
 * GET /auth/callback
 * Handles the OAuth callback from the authorization server
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	// Check for OAuth error response
	const error = url.searchParams.get('error');
	if (error) {
		const errorDescription = url.searchParams.get('error_description');
		return json(
			{
				error,
				error_description: errorDescription
			},
			{ status: 401 }
		);
	}

	// Validate required parameters
	const code = url.searchParams.get('code');
	if (!code) {
		return json({ error: 'Missing authorization code' }, { status: 400 });
	}

	const state = url.searchParams.get('state');
	if (!state) {
		return json({ error: 'Missing state parameter' }, { status: 400 });
	}

	try {
		const client = getOAuthClient();

		// Exchange authorization code for tokens
		const params = new URLSearchParams();
		params.set('code', code);
		params.set('state', state);

		// Add iss parameter if present (required by some OAuth servers)
		const iss = url.searchParams.get('iss');
		if (iss) {
			params.set('iss', iss);
		}

		const result = await client.callback(params);
		const did = result.session.did;

		// Resolve handle from DID
		const handle = await resolveHandle(did);

		// Create session for the user
		const session = {
			did,
			handle,
			expiresAt: Date.now() + SESSION_DURATION
		};

		createSession(cookies, session, SESSION_SECRET);

		// Redirect to home page
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/'
			}
		});
	} catch (error) {
		console.error('OAuth callback error:', error);
		return json({ error: 'Authentication failed' }, { status: 401 });
	}
};
