<script lang="ts">
	/**
	 * A text field with its action button beside it: a search box and "Sök",
	 * an id and "Öppna". Enter in the field and a click on the button do the
	 * same thing.
	 *
	 * The button always matches the field: the same text size and the same
	 * height, compact or not.
	 */
	import Button from './Button.svelte';
	import TextField from './TextField.svelte';

	interface TextFieldWithButtonProps {
		value: string;
		onChange: (value: string) => void;
		/** Called by Enter in the field and by the button. */
		onSubmit: () => void;
		buttonLabel: string;
		/** Disables the button only; Enter is the caller's to guard. */
		buttonDisabled?: boolean;
		label?: string;
		placeholder?: string;
		type?: string;
		compact?: boolean;
	}

	let {
		value,
		onChange,
		onSubmit,
		buttonLabel,
		buttonDisabled = false,
		label,
		placeholder,
		type = 'text',
		compact = false
	}: TextFieldWithButtonProps = $props();

	const id = $props.id();
</script>

<div>
	{#if label}
		<label for={id} class="mb-1 block text-xs text-gray-600 dark:text-gray-400">{label}</label>
	{/if}
	<div class="flex gap-2">
		<TextField
			{id}
			{value}
			{onChange}
			{placeholder}
			{type}
			{compact}
			fullWidth
			onEnter={onSubmit}
		/>
		<Button
			onclick={onSubmit}
			disabled={buttonDisabled}
			variant="outlined"
			{compact}
			matchField
			class="shrink-0 whitespace-nowrap"
		>
			{buttonLabel}
		</Button>
	</div>
</div>
