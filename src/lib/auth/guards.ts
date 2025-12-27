import { redirect } from '@sveltejs/kit';
import type { User } from '$lib/types';

/**
 * Require authentication for a route
 * Use in +page.server.ts or +layout.server.ts load functions
 *
 * @param locals - The locals object from the request event
 * @param redirectTo - URL to redirect to if not authenticated (default: /auth/login)
 * @returns The authenticated user
 * @throws Redirect to login page if not authenticated
 *
 * @example
 * ```ts
 * // In +page.server.ts
 * export const load: PageServerLoad = async ({ locals }) => {
 *   const user = requireAuth(locals);
 *   return { user };
 * };
 * ```
 */
export function requireAuth(locals: App.Locals, redirectTo = '/auth/login'): User {
	if (!locals.user) {
		redirect(303, redirectTo);
	}
	return locals.user;
}

/**
 * Redirect away from a page if already authenticated
 * Useful for login/signup pages that shouldn't be accessible when logged in
 *
 * @param locals - The locals object from the request event
 * @param redirectTo - URL to redirect to if authenticated (default: /)
 * @throws Redirect to home page if authenticated
 *
 * @example
 * ```ts
 * // In +page.server.ts for login page
 * export const load: PageServerLoad = async ({ locals }) => {
 *   redirectIfAuthenticated(locals);
 *   return {};
 * };
 * ```
 */
export function redirectIfAuthenticated(locals: App.Locals, redirectTo = '/'): void {
	if (locals.user) {
		redirect(303, redirectTo);
	}
}
