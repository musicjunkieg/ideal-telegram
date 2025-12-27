import type { RequestHandler } from './$types';
import { destroySession } from '$lib/session';
import { getOAuthClient } from '$lib/oauth/client';

/**
 * Revoke OAuth tokens for the user if they're logged in.
 * Failures are logged but don't prevent logout.
 */
async function revokeTokens(did: string | undefined): Promise<void> {
	if (!did) return;

	try {
		const client = getOAuthClient();
		await client.revoke(did);
	} catch (error) {
		// Log but don't fail - user should still be logged out
		console.error('Failed to revoke OAuth tokens:', error);
	}
}

/**
 * POST /auth/logout
 * Revokes OAuth tokens and clears the session
 */
export const POST: RequestHandler = async ({ cookies, locals }) => {
	await revokeTokens(locals.user?.did);
	destroySession(cookies);

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/'
		}
	});
};

/**
 * GET /auth/logout
 * Also supports GET for convenience (e.g., direct link)
 */
export const GET: RequestHandler = async ({ cookies, locals }) => {
	await revokeTokens(locals.user?.did);
	destroySession(cookies);

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/'
		}
	});
};
