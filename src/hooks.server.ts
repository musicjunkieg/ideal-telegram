import type { Handle } from '@sveltejs/kit';
import { SESSION_SECRET } from '$env/static/private';
import { getSession, shouldRefreshSession, refreshSession } from '$lib/session';

export const handle: Handle = async ({ event, resolve }) => {
	// Get session from encrypted cookie
	const session = getSession(event.cookies, SESSION_SECRET);

	if (session) {
		// Set user in locals
		event.locals.user = {
			did: session.did,
			handle: session.handle
		};

		// Refresh session if it's close to expiration
		if (shouldRefreshSession(session)) {
			refreshSession(event.cookies, session, SESSION_SECRET);
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};
