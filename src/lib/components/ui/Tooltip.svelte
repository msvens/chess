<script module lang="ts">
	export type TooltipPlacement =
		'top' | 'bottom' | 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
</script>

<script lang="ts">
	/**
	 * A tooltip bubble placed against an anchor element.
	 * From mphotos-svelte's `Tooltip`, with one change: there the tooltip wrapped
	 * its trigger in a `<div>` that listened for hover and focus, which needs an
	 * a11y suppression on a non-interactive element. Here the bubble is all it
	 * is — the trigger (e.g. `IconButton`'s own `<button>`) owns the events and
	 * says when it is `open`.
	 *
	 * `position: fixed`, so a parent's `overflow` cannot clip it; measured once
	 * in the DOM so short labels centre, and clamped to the viewport so a trigger
	 * near an edge keeps its bubble on screen.
	 */
	interface TooltipProps {
		/** The element the bubble is placed against. */
		anchor: HTMLElement | undefined;
		open: boolean;
		title: string;
		placement?: TooltipPlacement;
	}

	let { anchor, open, title, placement = 'bottom' }: TooltipProps = $props();

	const GAP = 4;
	/** Keep this far from the viewport edge. */
	const MARGIN = 8;

	let bubble = $state<HTMLDivElement | null>(null);
	let pos = $state<{ top?: number; left?: number; right?: number } | null>(null);

	const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

	$effect(() => {
		if (!open || !bubble || !anchor) {
			pos = null;
			return;
		}
		const r = anchor.getBoundingClientRect();
		const w = bubble.offsetWidth;
		const h = bubble.offsetHeight;
		const maxLeft = window.innerWidth - w - MARGIN;
		const maxTop = window.innerHeight - h - MARGIN;

		switch (placement) {
			case 'top':
				pos = { top: r.top - h - GAP, left: clamp(r.left + (r.width - w) / 2, MARGIN, maxLeft) };
				break;
			case 'bottom':
				pos = { top: r.bottom + GAP, left: clamp(r.left + (r.width - w) / 2, MARGIN, maxLeft) };
				break;
			case 'left':
				pos = { top: clamp(r.top + (r.height - h) / 2, MARGIN, maxTop), left: r.left - w - GAP };
				break;
			case 'right':
				pos = { top: clamp(r.top + (r.height - h) / 2, MARGIN, maxTop), left: r.right + GAP };
				break;
			case 'bottom-left':
				pos = { top: r.bottom + GAP, right: window.innerWidth - r.right };
				break;
			case 'bottom-right':
				pos = { top: r.bottom + GAP, left: r.left };
				break;
			case 'top-left':
				pos = { top: r.top - h - GAP, right: window.innerWidth - r.right };
				break;
			case 'top-right':
				pos = { top: r.top - h - GAP, left: r.left };
				break;
		}
	});

	let style = $derived(
		pos
			? [
					pos.top !== undefined ? `top: ${pos.top}px` : '',
					pos.left !== undefined ? `left: ${pos.left}px` : '',
					pos.right !== undefined ? `right: ${pos.right}px` : ''
				]
					.filter(Boolean)
					.join('; ')
			: ''
	);
</script>

{#if open && title}
	<!-- Rendered (to measure) but invisible until positioned, to avoid a first-frame flash. -->
	<div
		bind:this={bubble}
		role="tooltip"
		class="pointer-events-none fixed z-[9999] rounded bg-[#616161] px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg transition-opacity duration-75 {pos
			? 'opacity-100'
			: 'opacity-0'}"
		{style}
	>
		{title}
	</div>
{/if}
