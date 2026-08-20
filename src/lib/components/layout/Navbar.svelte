<script lang="ts">
	/**
	 * The site bar. Ports `navbar/Navbar.tsx`.
	 *
	 * Desktop uses a 1fr/4fr/1fr grid rather than flex+space-between, so the centre
	 * group is centred against the viewport and does not drift when the brand or the
	 * right-hand items change width. Mobile is a plain flex row plus a drawer.
	 *
	 * It is `fixed`, hence PageSpacing: content would otherwise start underneath it.
	 */
	import { Bars3, Icon } from 'svelte-hero-icons';
	import Link from '$lib/components/ui/Link.svelte';
	import NavItemLink from './NavItem.svelte';
	import NavDropdown from './NavDropdown.svelte';
	import NavbarMobileMenu from './NavbarMobileMenu.svelte';
	import type { NavBrand, NavDisplay, NavItem } from './navTypes';

	interface NavbarProps {
		brand: NavBrand;
		display?: NavDisplay;
		showBorder?: boolean;
		centerItems?: NavItem[];
		rightItems?: NavItem[];
	}

	let {
		brand,
		display = 'text',
		showBorder = true,
		centerItems = [],
		rightItems = []
	}: NavbarProps = $props();

	let menuOpen = $state(false);

	// The drawer shows everything, since it has no room for a centre/right split.
	let mobileItems = $derived([...centerItems, ...rightItems]);

	const brandClass =
		'flex items-center gap-2 text-base font-light leading-tight tracking-widest uppercase text-gray-900 dark:text-gray-200';
</script>

{#snippet brandMark()}
	<!-- The wordmark is two block spans, which the accessible-name algorithm
	     concatenates without a separator ("msvenschess"). An explicit label keeps
	     the visual stack and still reads correctly. -->
	<Link
		href={brand.href}
		color="inherit"
		underline="never"
		class={brandClass}
		ariaLabel={brand.lines.join(' ')}
	>
		{#if brand.logo}
			<!-- Plain <img>: the Next version passed `unoptimized`, so nothing was
			     going through the image optimiser anyway. -->
			<img src={brand.logo} alt="" width="40" height="40" class="h-10 w-auto object-contain" />
		{/if}
		<div>
			{#each brand.lines as line (line)}
				<span class="block">{line}</span>
			{/each}
		</div>
	</Link>
{/snippet}

<nav
	class="fixed top-0 right-0 left-0 z-50 bg-white dark:bg-dark-bg {showBorder
		? 'border-b border-gray-200 shadow-sm dark:border-gray-700'
		: ''}"
>
	<div class="mx-auto max-w-full px-1 py-2">
		<!-- Desktop -->
		<div class="hidden h-12 grid-cols-[1fr_4fr_1fr] items-center md:grid">
			<div class="flex items-center">{@render brandMark()}</div>

			<div class="flex items-center justify-center gap-1">
				{#each centerItems as item (item.id)}
					{#if item.kind === 'link'}
						<NavItemLink {item} {display} />
					{:else}
						<NavDropdown {item} {display} />
					{/if}
				{/each}
			</div>

			<div class="flex items-center justify-end gap-1">
				{#each rightItems as item (item.id)}
					{#if item.kind === 'link'}
						<NavItemLink {item} {display} />
					{:else}
						<NavDropdown {item} {display} />
					{/if}
				{/each}
			</div>
		</div>

		<!-- Mobile -->
		<div class="flex h-12 items-center justify-between md:hidden">
			<div class="flex items-center">{@render brandMark()}</div>

			<button
				onclick={() => (menuOpen = !menuOpen)}
				aria-expanded={menuOpen}
				class="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
			>
				<Icon src={Bars3} class="h-6 w-6" aria-hidden="true" />
				<span class="sr-only">Menu</span>
			</button>
		</div>
	</div>

	<NavbarMobileMenu open={menuOpen} onClose={() => (menuOpen = false)} items={mobileItems} />
</nav>
