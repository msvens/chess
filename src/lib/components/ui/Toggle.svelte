<script lang="ts">
	/**
	 * A switch with a label. Ports `components/Toggle.tsx`.
	 *
	 * A real checkbox kept visually hidden (`sr-only peer`) rather than a div with
	 * a click handler, so it is keyboard-operable and announced correctly; the
	 * visible switch is drawn from the checkbox's `peer` state.
	 */
	interface ToggleProps {
		checked: boolean;
		onChange: (checked: boolean) => void;
		label: string;
		class?: string;
	}

	let { checked, onChange, label, class: cls = '' }: ToggleProps = $props();
</script>

<label class="flex cursor-pointer items-center gap-2 select-none {cls}">
	<div class="relative">
		<input
			type="checkbox"
			{checked}
			onchange={(e) => onChange(e.currentTarget.checked)}
			class="peer sr-only"
		/>
		<div
			class="peer h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:peer-focus:ring-offset-dark-bg"
		></div>
	</div>
	<span
		class="text-sm transition-colors {checked
			? 'font-medium text-gray-900 dark:text-gray-200'
			: 'text-gray-500 dark:text-gray-400'}"
	>
		{label}
	</span>
</label>
