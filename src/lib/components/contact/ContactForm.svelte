<script lang="ts">
	/**
	 * The feedback form. Ports `app/contact/page.tsx`.
	 *
	 * Posts straight to Formspree from the browser. Formspree allows that
	 * cross-origin, so unlike the SSF API it needs no proxy.
	 *
	 * With no endpoint it shows a placeholder rather than a form that could only
	 * fail.
	 */
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	type Status = 'idle' | 'sending' | 'success' | 'error';

	let { endpoint }: { endpoint: string | undefined } = $props();

	let t = $derived(getTranslation(language.current).pages.contact);

	let email = $state('');
	let message = $state('');
	let status = $state<Status>('idle');

	const inputClass =
		'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500';

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!endpoint) return;

		status = 'sending';
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, message })
			});
			if (response.ok) {
				status = 'success';
				email = '';
				message = '';
			} else {
				status = 'error';
			}
		} catch {
			status = 'error';
		}
	}
</script>

{#if !endpoint}
	<div class="p-6 text-center">
		<p class="text-gray-600 dark:text-gray-400">{t.underConstruction}</p>
	</div>
{:else if status === 'success'}
	<div
		class="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20"
	>
		<p class="text-green-800 dark:text-green-200">{t.form.success}</p>
	</div>
{:else}
	<form onsubmit={submit} class="space-y-6">
		<div>
			<label for="email" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
				{t.form.email}
			</label>
			<input
				type="email"
				id="email"
				name="email"
				required
				bind:value={email}
				placeholder={t.form.emailPlaceholder}
				class={inputClass}
				disabled={status === 'sending'}
			/>
		</div>

		<div>
			<label for="message" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
				{t.form.message}
			</label>
			<textarea
				id="message"
				name="message"
				required
				rows={6}
				bind:value={message}
				placeholder={t.form.messagePlaceholder}
				class="{inputClass} resize-none"
				disabled={status === 'sending'}></textarea>
		</div>

		{#if status === 'error'}
			<div
				class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
			>
				<p class="text-sm text-red-800 dark:text-red-200">{t.form.error}</p>
			</div>
		{/if}

		<button
			type="submit"
			disabled={status === 'sending'}
			class="w-full rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
		>
			{status === 'sending' ? t.form.sending : t.form.submit}
		</button>
	</form>
{/if}
