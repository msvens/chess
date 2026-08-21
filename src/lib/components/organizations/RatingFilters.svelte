<script lang="ts">
	/**
	 * Rating date / rating type / member type, as three dropdowns.
	 * Ports `components/organizations/RatingFilters.tsx`.
	 */
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { PlayerCategory, RatingType } from '$lib/api';
	import {
		dateItems,
		formatDateLocal,
		memberTypeItems,
		parseDateLocal,
		ratingTypeItems,
		type RatingFiltersValue
	} from './ratingFilters';

	interface RatingFiltersProps {
		value: RatingFiltersValue;
		onChange: (value: RatingFiltersValue) => void;
		/** How many months of rating lists to offer. */
		monthsToShow?: number;
	}

	let { value, onChange, monthsToShow = 12 }: RatingFiltersProps = $props();

	let t = $derived(getTranslation(language.current));
	let labels = $derived(t.pages.organizations.ratingList);
	let dates = $derived(dateItems(monthsToShow));
	let types = $derived(ratingTypeItems(t));
	let members = $derived(memberTypeItems(t));
</script>

<div class="grid grid-cols-3 gap-2 sm:gap-4">
	<SelectableList
		items={dates}
		selectedId={formatDateLocal(value.ratingDate)}
		onSelect={(id) => onChange({ ...value, ratingDate: parseDateLocal(String(id)) })}
		title={labels.dateLabel}
		placeholder={t.components.selectableList.selectPlaceholder}
		variant="dropdown"
		density="compact"
	/>
	<SelectableList
		items={types}
		selectedId={value.ratingType}
		onSelect={(id) => onChange({ ...value, ratingType: id as RatingType })}
		title={labels.ratingTypeLabel}
		placeholder={t.components.selectableList.selectPlaceholder}
		variant="dropdown"
		density="compact"
	/>
	<SelectableList
		items={members}
		selectedId={value.memberType}
		onSelect={(id) => onChange({ ...value, memberType: id as PlayerCategory })}
		title={labels.memberTypeLabel}
		placeholder={t.components.selectableList.selectPlaceholder}
		variant="dropdown"
		density="compact"
	/>
</div>
