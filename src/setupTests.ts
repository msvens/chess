// Adds @testing-library/jest-dom matchers (toBeInTheDocument, etc.) to Vitest.
import '@testing-library/jest-dom/vitest';

// jsdom ships no CSSOM-view module, so `window.matchMedia` is undefined — and Svelte's
// `MediaQuery` calls it in its constructor, so anything using one throws on import.
// This stand-in matches nothing, i.e. desktop and landscape. Tests needing another
// viewport call `setViewport()` from `$lib/test-utils` before rendering.
//
// Guarded because this setup file also runs for the node-environment integration
// suites (`*.integration.test.ts`), where there is no `window` at all.
if (typeof window !== 'undefined') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			// MediaQuery subscribes with `on(q, 'change', …)`, so these must exist.
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false
		})
	});
}
