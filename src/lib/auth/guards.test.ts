import { describe, it, expect, vi } from 'vitest';
import { requireAuth, redirectIfAuthenticated } from './guards';
import type { User } from '$lib/types';

// Mock @sveltejs/kit redirect
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		redirect: vi.fn((status: number, location: string) => {
			throw { status, location };
		})
	};
});

interface RedirectError {
	status: number;
	location: string;
}

describe('requireAuth', () => {
	it('returns user when authenticated', () => {
		const user: User = {
			did: 'did:plc:test123',
			handle: 'testuser.bsky.social'
		};

		const result = requireAuth({ user } as App.Locals);

		expect(result).toEqual(user);
	});

	it('throws redirect when not authenticated', () => {
		expect(() => requireAuth({ user: null } as App.Locals)).toThrow();

		try {
			requireAuth({ user: null } as App.Locals);
		} catch (e) {
			const err = e as RedirectError;
			expect(err.status).toBe(303);
			expect(err.location).toBe('/auth/login');
		}
	});

	it('redirects to custom URL when provided', () => {
		try {
			requireAuth({ user: null } as App.Locals, '/custom-login');
		} catch (e) {
			const err = e as RedirectError;
			expect(err.status).toBe(303);
			expect(err.location).toBe('/custom-login');
		}
	});
});

describe('redirectIfAuthenticated', () => {
	it('does nothing when not authenticated', () => {
		// Should not throw
		expect(() => redirectIfAuthenticated({ user: null } as App.Locals)).not.toThrow();
	});

	it('throws redirect when authenticated', () => {
		const user: User = {
			did: 'did:plc:test123',
			handle: 'testuser.bsky.social'
		};

		expect(() => redirectIfAuthenticated({ user } as App.Locals)).toThrow();

		try {
			redirectIfAuthenticated({ user } as App.Locals);
		} catch (e) {
			const err = e as RedirectError;
			expect(err.status).toBe(303);
			expect(err.location).toBe('/');
		}
	});

	it('redirects to custom URL when provided', () => {
		const user: User = {
			did: 'did:plc:test123',
			handle: 'testuser.bsky.social'
		};

		try {
			redirectIfAuthenticated({ user } as App.Locals, '/dashboard');
		} catch (e) {
			const err = e as RedirectError;
			expect(err.status).toBe(303);
			expect(err.location).toBe('/dashboard');
		}
	});
});
