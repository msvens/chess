import { defineConfig } from 'vitest/config';

/**
 * Config for the live suites only (`pnpm test:integration`).
 *
 * Separate from the unit run for two reasons: these tests need the network, and
 * the proxy suite needs a real dev server — `globalSetup` boots one and shares it
 * across the files, which would be pointless overhead on every `pnpm test`.
 *
 * The dev server is created from the ordinary vite.config.ts, so the proxy under
 * test is the same configuration dev uses. No test-only copy to drift.
 */
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.integration.test.ts'],
		globalSetup: ['src/lib/api/__tests__/helpers/devServer.ts'],
		// Live third-party calls; ChessTools in particular is slow and often 503s.
		testTimeout: 20_000,
		// Booting SvelteKit's dev server takes noticeably longer than vitest's default.
		hookTimeout: 60_000
	}
});
