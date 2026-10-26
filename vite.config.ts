import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { fileURLToPath } from 'node:url';

// Upstreams. In production nginx owns these two prefixes; in dev the Vite
// proxy below stands in for it, so the app always talks to same-origin
// /api/* and never needs CORS.
//
// The proxy is NOT optional: SSF answers a CORS preflight with 403, and the SDK
// sets `Content-Type: application/json` on every request (including bodyless
// GETs), which forces one. Direct browser calls therefore cannot work.
const SSF_API = 'https://member.schack.se';
const SSF_API_PREFIX = '/public/api/v1';
// FIDE data comes from mfide, which needs an API key. Production nginx adds it
// under /api/fide, so dev forwards there too: a fresh clone runs without a
// local mfide and the key never enters this repo. To test against a local
// stack instead, set FIDE_PROXY_TARGET (e.g. http://localhost:8061).
const FIDE_PROXY_TARGET = process.env.FIDE_PROXY_TARGET ?? 'https://chess.msvens.com';

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
		watch: {
			// `pnpm build` (part of `pnpm check`) rewrites build/index.html, and a
			// running dev server takes a changed .html file for a source change and
			// reloads the page. The production output is never source, so ignore
			// exactly this folder — anchored, so a `build/` elsewhere still reloads.
			ignored: [`${fileURLToPath(new URL('./build', import.meta.url))}/**`]
		},
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
			// No rewrite: the target's nginx owns /api/fide and maps it onto mfide.
			'/api/fide': {
				target: FIDE_PROXY_TARGET,
				changeOrigin: true
			}
		}
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['src/setupTests.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
