import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	// Use PUBLIC_APP_URL if set, otherwise derive from request
	const baseUrl = env.PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
	const clientId = `${baseUrl}/client-metadata.json`;

	const metadata = {
		// Required: Must match the URL used to fetch this document
		client_id: clientId,

		// App identification
		client_name: 'Charcoal',
		client_uri: baseUrl,

		// OAuth flow configuration
		redirect_uris: [`${baseUrl}/auth/callback`],
		grant_types: ['authorization_code', 'refresh_token'],
		response_types: ['code'],

		// Scopes - atproto is required, transition:generic for broad access
		scope: 'atproto transition:generic',

		// Public client - no client secret
		token_endpoint_auth_method: 'none',

		// DPoP is required for AT Protocol OAuth
		dpop_bound_access_tokens: true,

		// Web application
		application_type: 'web'
	};

	return json(metadata, {
		headers: {
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
