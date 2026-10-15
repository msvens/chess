<script lang="ts">
	/**
	 * A round icon button with a tooltip.
	 * From mphotos-svelte's `IconButton`, styled like this app's nav buttons.
	 *
	 * Shows an `icon`, or `children` for content that is not an icon (an emoji
	 * flag, say). `title` is both the tooltip and the accessible name — the icon
	 * alone would leave the button unnamed. The tooltip appears on hover or
	 * keyboard focus after `delay`, like a native one but styled and reliable
	 * (a native `title` never shows for keyboard users).
	 */
	import { onDestroy, type Snippet } from 'svelte';
	import { Icon, type IconSource } from 'svelte-hero-icons';
	import Tooltip, { type TooltipPlacement } from './Tooltip.svelte';

	type IconButtonSize = 'small' | 'medium';

	interface IconButtonProps {
		icon?: IconSource;
		children?: Snippet;
		onclick?: () => void;
		/** Tooltip text, and the accessible name unless `ariaLabel` is given. */
		title: string;
		ariaLabel?: string;
		tooltipPlacement?: TooltipPlacement;
		/** Milliseconds of hover or focus before the tooltip shows. */
		delay?: number;
		size?: IconButtonSize;
		class?: string;
	}

	let {
		icon,
		children,
		onclick,
		title,
		ariaLabel,
		tooltipPlacement = 'bottom',
		delay = 1000,
		size = 'medium',
		class: cls = ''
	}: IconButtonProps = $props();

	const sizeClasses: Record<IconButtonSize, { button: string; icon: string }> = {
		small: { button: 'h-8 w-8', icon: 'h-5 w-5' },
		medium: { button: 'h-10 w-10', icon: 'h-6 w-6' }
	};

	let button = $state<HTMLButtonElement>();
	let open = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function show() {
		clearTimeout(timer);
		if (delay <= 0) open = true;
		else timer = setTimeout(() => (open = true), delay);
	}

	function hide() {
		clearTimeout(timer);
		open = false;
	}

	onDestroy(() => clearTimeout(timer));
</script>

<button
	bind:this={button}
	type="button"
	onclick={() => {
		hide();
		onclick?.();
	}}
	onmouseenter={show}
	onmouseleave={hide}
	onfocus={show}
	onblur={hide}
	aria-label={ariaLabel ?? title}
	class="inline-flex items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:scale-90 dark:text-gray-400 dark:hover:bg-gray-800 {sizeClasses[
		size
	].button} {cls}"
>
	{#if icon}
		<Icon src={icon} class={sizeClasses[size].icon} aria-hidden="true" />
	{:else if children}
		{@render children()}
	{/if}
</button>

<Tooltip anchor={button} {open} {title} placement={tooltipPlacement} />
