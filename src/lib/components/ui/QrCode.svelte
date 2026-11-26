<script lang="ts">
	/**
	 * A QR code for `value`, drawn as one SVG path.
	 *
	 * Always dark on a white field, in dark mode too: scanners expect dark
	 * modules on a light background, and the quiet zone (the white border)
	 * is part of the code, not padding.
	 */
	import { encode } from 'uqr';

	interface QrCodeProps {
		value: string;
		/** The accessible name; a code alone says nothing to a screen reader. */
		label: string;
		class?: string;
	}

	let { value, label, class: cls = '' }: QrCodeProps = $props();

	let qr = $derived(encode(value, { border: 2 }));

	/** One unit square per dark module: a single path keeps the DOM small. */
	let path = $derived(
		qr.data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))).join('')
	);
</script>

<svg
	role="img"
	aria-label={label}
	viewBox="0 0 {qr.size} {qr.size}"
	shape-rendering="crispEdges"
	class="bg-white {cls}"
>
	<path d={path} fill="#000" />
</svg>
