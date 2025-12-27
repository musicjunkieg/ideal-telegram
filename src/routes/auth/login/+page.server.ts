import { redirectIfAuthenticated } from '$lib/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	// Redirect to home if already logged in
	redirectIfAuthenticated(locals, '/');

	return {};
};
