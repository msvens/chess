<script lang="ts">
	/**
	 * The standard page container: navbar spacer, then a centred, width-capped
	 * column. Ports `components/layout/PageLayout.tsx`.
	 *
	 * Every page uses this rather than hand-rolling a container — it is the one place
	 * the max widths and horizontal padding are decided.
	 */
	import type { Snippet } from 'svelte';
	import PageSpacing from './PageSpacing.svelte';

	type MaxWidth = '3xl' | '4xl' | '5xl' | '7xl';

	interface PageLayoutProps {
		children: Snippet;
		/** Only the widths the app actually uses. */
		maxWidth?: MaxWidth;
		spacing?: 'default' | 'no_spacing' | (string & {});
		fullScreen?: boolean;
		class?: string;
	}

	let {
		children,
		maxWidth = '7xl',
		spacing = 'default',
		fullScreen = false,
		class: cls = ''
	}: PageLayoutProps = $props();

	// Spelled out for Tailwind's scanner — it cannot see `max-w-${x}`.
	const maxWidthClasses: Record<MaxWidth, string> = {
		'3xl': 'max-w-3xl',
		'4xl': 'max-w-4xl',
		'5xl': 'max-w-5xl',
		'7xl': 'max-w-7xl'
	};
</script>

<PageSpacing height={spacing} />
<div class={fullScreen ? 'min-h-screen' : ''}>
	<div class="{maxWidthClasses[maxWidth]} mx-auto mb-8 px-4 {cls}">
		{@render children()}
	</div>
</div>
