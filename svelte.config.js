import adapterAuto from '@sveltejs/adapter-auto';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isStaticBuild = process.env.STATIC_BUILD === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Use static adapter for landing page deployment, auto for full app
		adapter: isStaticBuild
			? adapterStatic({
					pages: 'build-static',
					assets: 'build-static',
					fallback: null,
					precompress: true,
					strict: false
				})
			: adapterAuto(),
		prerender: isStaticBuild
			? {
					entries: ['/'],
					handleHttpError: ({ path, message }) => {
						// Ignore 404s for pages we haven't built yet
						if (path === '/privacy' || path === '/terms' || path.startsWith('/auth')) {
							console.warn(`Ignoring missing route during static build: ${path}`);
							return;
						}
						throw new Error(message);
					}
				}
			: {}
	}
};

export default config;
