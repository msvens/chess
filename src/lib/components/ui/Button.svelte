<script lang="ts">
	/**
	 * Ports `components/Button.tsx`.
	 *
	 * The full colour × variant table is carried over even though the app currently
	 * uses only `default`/`primary` and `outlined`/`contained`. It is a coherent
	 * palette taken from MUI, and a half-ported palette is worse than a whole one —
	 * the next person wanting an error button would have to reconstruct it. It costs
	 * only static strings.
	 *
	 * `href` is not carried over: no caller used it, and a link that looks like a
	 * button is better written as a link.
	 */
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'text' | 'outlined' | 'contained';
	type ButtonColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';

	interface ButtonProps {
		children: Snippet;
		variant?: ButtonVariant;
		color?: ButtonColor;
		onclick?: (event: MouseEvent) => void;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		fullWidth?: boolean;
		compact?: boolean;
		class?: string;
		/** Tooltip, for a button whose label cannot say the whole story. */
		title?: string;
	}

	let {
		children,
		variant = 'contained',
		color = 'default',
		onclick,
		type = 'button',
		disabled = false,
		fullWidth = false,
		compact = false,
		class: cls = '',
		title
	}: ButtonProps = $props();

	// Spelled out in full — Tailwind's scanner cannot see composed class names.
	const colorStyles: Record<ButtonColor, Record<ButtonVariant, string>> = {
		default: {
			text: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
			outlined:
				'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
			contained:
				'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
		},
		primary: {
			text: 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30',
			outlined:
				'border border-blue-500 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30',
			contained: 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
		},
		secondary: {
			text: 'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30',
			outlined:
				'border border-purple-500 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30',
			contained:
				'bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700'
		},
		success: {
			text: 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30',
			outlined:
				'border border-green-500 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30',
			contained:
				'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
		},
		warning: {
			text: 'text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/30',
			outlined:
				'border border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/30',
			contained:
				'bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700'
		},
		error: {
			text: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30',
			outlined:
				'border border-red-500 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30',
			contained: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
		}
	};

	let classes = $derived(
		[
			'inline-flex items-center justify-center rounded transition-colors',
			compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2',
			fullWidth ? 'w-full' : '',
			colorStyles[color][variant],
			cls
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<button {type} {disabled} {onclick} {title} class={classes}>
	{@render children()}
</button>
