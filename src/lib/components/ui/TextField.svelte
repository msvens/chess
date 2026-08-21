<script lang="ts">
	/** A text or textarea input. Ports `components/TextField.tsx`. */
	interface TextFieldProps {
		value: string;
		onChange: (value: string) => void;
		id?: string;
		label?: string;
		placeholder?: string;
		type?: string;
		fullWidth?: boolean;
		multiline?: boolean;
		rows?: number;
		margin?: 'none' | 'dense' | 'normal';
		disabled?: boolean;
		compact?: boolean;
		/** Fires on Enter — search fields want it, and it saves reaching for a form. */
		onEnter?: () => void;
	}

	let {
		value,
		onChange,
		id,
		label,
		placeholder,
		type = 'text',
		fullWidth = false,
		multiline = false,
		rows = 1,
		margin = 'none',
		disabled = false,
		compact = false,
		onEnter
	}: TextFieldProps = $props();

	const marginClasses = { none: '', dense: 'mt-2', normal: 'mt-4' } as const;

	let base = $derived(
		[
			'rounded border border-gray-300 bg-transparent text-gray-900 placeholder-gray-500',
			'focus:border-gray-900 focus:outline-none',
			'dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:border-white',
			'disabled:cursor-not-allowed disabled:opacity-50',
			compact ? 'px-3 py-1.5 text-sm' : 'px-3 py-2',
			fullWidth ? 'w-full' : '',
			marginClasses[margin],
			// Date inputs need help with the calendar icon in dark mode.
			type === 'date'
				? 'min-w-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:opacity-70 dark:[&::-webkit-calendar-picker-indicator]:invert'
				: ''
		]
			.filter(Boolean)
			.join(' ')
	);

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && onEnter) onEnter();
	}
</script>

<div class={fullWidth ? 'w-full' : ''}>
	{#if label}
		<label for={id} class="mb-1 block text-xs text-gray-600 dark:text-gray-400">{label}</label>
	{/if}
	{#if multiline}
		<textarea
			{id}
			{rows}
			{placeholder}
			{disabled}
			{value}
			oninput={(e) => onChange(e.currentTarget.value)}
			class={base}></textarea>
	{:else}
		<input
			{id}
			{type}
			{placeholder}
			{disabled}
			{value}
			oninput={(e) => onChange(e.currentTarget.value)}
			{onkeydown}
			class={base}
		/>
	{/if}
</div>
