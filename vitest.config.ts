import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		// Enable globals (describe, it, expect) without imports
		globals: true,

		// Use jsdom for DOM testing
		environment: 'jsdom',

		// Include test files
		include: ['src/**/*.{test,spec}.{js,ts}'],

		// Setup files run before each test file
		setupFiles: ['src/tests/setup.ts'],

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			include: ['src/**/*.{js,ts,svelte}'],
			exclude: [
				'src/**/*.{test,spec}.{js,ts}',
				'src/tests/**',
				'src/app.d.ts',
				'src/app.html'
			]
		},

		// Resolve $lib and other SvelteKit aliases
		alias: {
			$lib: '/src/lib'
		}
	}
});
