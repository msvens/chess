<script lang="ts">
	/**
	 * Clears the fixed navbar and adds breathing room below it.
	 *
	 * The navbar is `fixed`, so it is out of flow and content would otherwise start
	 * underneath it — hence a spacer rather than padding on a wrapper. Values are the
	 * Next app's: 96px = 56px navbar + 40px, and 'no_spacing' = the navbar alone.
	 *
	 * `height` also accepts any CSS length, which a couple of pages rely on.
	 */
	interface PageSpacingProps {
		height?: 'default' | 'no_spacing' | (string & {});
		class?: string;
	}

	let { height = 'default', class: cls = '' }: PageSpacingProps = $props();

	let resolved = $derived(
		height === 'default' ? '96px' : height === 'no_spacing' ? '56px' : height
	);
</script>

<div style="height: {resolved}" class={cls}></div>
