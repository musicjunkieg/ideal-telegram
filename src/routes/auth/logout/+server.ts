import type { RequestHandler } from './$types';
import { destroySession } from '$lib/session';

/**
 * POST /auth/logout
 * Clears the session and redirects to home
 */
export const POST: RequestHandler = async ({ cookies }) => {
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
export const GET: RequestHandler = async ({ cookies }) => {
	destroySession(cookies);

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/'
		}
	});
};
