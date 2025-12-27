import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/oauth/client';

/**
 * GET /auth/login?handle=<handle>
 * Initiates OAuth flow by redirecting to the authorization server
 */
export const GET: RequestHandler = async ({ url }) => {
	const handle = url.searchParams.get('handle')?.trim();

	if (!handle) {
		return json({ error: 'Handle is required' }, { status: 400 });
	}

	try {
		const client = getOAuthClient();
		const authUrl = await client.authorize(handle, {
			scope: 'atproto transition:generic'
		});

		// Redirect to the authorization URL
		return new Response(null, {
			status: 302,
			headers: {
				Location: authUrl.toString()
			}
		});
	} catch (error) {
		console.error('OAuth authorization error:', error);
		return json({ error: 'Failed to initiate OAuth' }, { status: 500 });
	}
};

/**
 * POST /auth/login
 * Accepts handle from form submission and initiates OAuth flow
 */
export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const handle = formData.get('handle')?.toString().trim();

	if (!handle) {
		return json({ error: 'Handle is required' }, { status: 400 });
	}

	try {
		const client = getOAuthClient();
		const authUrl = await client.authorize(handle, {
			scope: 'atproto transition:generic'
		});

		// Redirect to the authorization URL
		return new Response(null, {
			status: 302,
			headers: {
				Location: authUrl.toString()
			}
		});
	} catch (error) {
		console.error('OAuth authorization error:', error);
		return json({ error: 'Failed to initiate OAuth' }, { status: 500 });
	}
};
