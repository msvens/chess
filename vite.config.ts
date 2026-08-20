import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

// Upstreams. In production nginx owns these two prefixes (see
// configs/providers/upcloud/mellowtech/etc/nginx/sites-available/chess.conf);
// in dev the Vite proxy below stands in for it, so the app always talks to
// same-origin /api/* and never needs CORS.
//
// The proxy is NOT optional: SSF answers a CORS preflight with 403, and the SDK
// sets `Content-Type: application/json` on every request (including bodyless
// GETs), which forces one. Direct browser calls therefore cannot work.
const SSF_API = 'https://member.schack.se';
const SSF_API_PREFIX = '/public/api/v1';
const CHESSTOOLS_API = 'https://api.chesstools.org';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static SPA: single fallback page, all routing/rendering happens client-side.
			adapter: adapter({ fallback: 'index.html' })
		}),
		// Renders Svelte components into jsdom for @testing-library/svelte tests
		// (resolve.conditions tweak + auto-cleanup between tests). Test-only.
		svelteTesting()
	],
	server: {
		// Same port the Next app used, for both `next dev` and `next start`, so the
		// dev URL, nginx upstream and every bookmark stay unchanged.
		port: 3001,
		strictPort: true,
		proxy: {
			// IMPORTANT: these rewrites substitute the prefix and nothing else. Do not
			// add slash normalisation here or in nginx. The SSF API is inconsistent —
			// GET endpoints 404 WITH a trailing slash, and its one POST (/player/list/)
			// 404s WITHOUT one. The SDK already emits the correct form per endpoint, so
			// the only way to break it is for a proxy to "helpfully" canonicalise.
			'/api/chess/v1': {
				target: SSF_API,
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/chess\/v1/, SSF_API_PREFIX)
			},
			'/api/chesstools': {
				target: CHESSTOOLS_API,
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/chesstools/, '')
			}
		}
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['src/setupTests.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
