import { describe, expect, it } from 'vitest';
import type { DistrictDTO } from '$lib/api';
import { getTranslation } from '$lib/translations';
import {
	OVRIGA,
	categoryItems,
	districtItems,
	stateItems,
	toDistrictId,
	toDistrictListId,
	typeItems
} from './filterItems';

const t = getTranslation('sv');

const districts = [
	{ id: 10, name: 'Stockholms SF' },
	{ id: 11, name: 'Skånes SF' }
] as DistrictDTO[];

describe('categoryItems', () => {
	it('offers all, team and individual', () => {
		expect(categoryItems(t).map((i) => i.id)).toEqual(['all', 'team', 'individual']);
	});

	it('shows counts in brackets when given them', () => {
		const items = categoryItems(t, { all: 12, team: 5, individual: 7 });
		expect(items[0].label).toMatch(/\(12\)$/);
		expect(items[1].label).toMatch(/\(5\)$/);
	});

	it('omits brackets entirely when there is nothing to count', () => {
		expect(categoryItems(t)[0].label).not.toMatch(/\(/);
	});
});

describe('typeItems', () => {
	it('always starts with all', () => {
		expect(typeItems(t)[0].id).toBe('all');
	});

	it('lists every type when no counts are supplied', () => {
		// Without counts nothing can be hidden, so every type must be offered.
		expect(typeItems(t).length).toBeGreaterThan(1);
	});

	// A filter that would always come back empty is noise, so a type nobody has is
	// left out rather than shown as "(0)".
	it('hides types with a zero count', () => {
		const items = typeItems(t, { all: 3, 2: 3, 3: 0, 9: 0 });
		expect(items.map((i) => i.id)).toEqual(['all', 2]);
	});

	it('keeps types with a non-zero count and labels them', () => {
		const items = typeItems(t, { all: 8, 2: 3, 9: 5 });
		expect(items.map((i) => i.id)).toEqual(['all', 2, 9]);
		expect(items[2].label).toMatch(/\(5\)$/);
	});
});

describe('stateItems', () => {
	it('offers all four states without counts', () => {
		expect(stateItems(t)).toHaveLength(4);
	});

	it('hides a state nobody is in', () => {
		const items = stateItems(t, { all: 4, registration: 0, started: 4, finished: 0 });
		expect(items).toHaveLength(2);
		expect(items[0].id).toBe('all');
	});
});

describe('districtItems', () => {
	it('lists all districts under an "all" entry when no counts are given', () => {
		const items = districtItems(t, districts);
		expect(items[0].id).toBe('all');
		expect(items.map((i) => i.id)).toEqual(['all', 10, 11]);
	});

	it('drops districts with nothing in them once counts are supplied', () => {
		const items = districtItems(t, districts, [
			{ districtId: 10, count: 3 },
			{ districtId: 11, count: 0 }
		]);
		expect(items.map((i) => i.id)).toEqual(['all', 10]);
	});

	it('adds the Övriga bucket only when something is in it', () => {
		const without = districtItems(t, districts, [{ districtId: 10, count: 3 }]);
		expect(without.map((i) => i.id)).not.toContain('ovriga');

		const with_ = districtItems(t, districts, [
			{ districtId: 10, count: 3 },
			{ districtId: null, count: 2 }
		]);
		expect(with_.map((i) => i.id)).toContain('ovriga');
	});

	it('uses the total count on the "all" entry when given one', () => {
		const items = districtItems(t, districts, [{ districtId: 10, count: 3 }], 42);
		expect(items[0].label).toMatch(/\(42\)$/);
	});
});

describe('district id mapping', () => {
	// The list needs string sentinels; the caller works in district ids, where null
	// means "all" and -1 means "no district".
	it('round-trips all', () => {
		expect(toDistrictId('all')).toBeNull();
		expect(toDistrictListId(null)).toBe('all');
	});

	it('round-trips Övriga', () => {
		expect(toDistrictId('ovriga')).toBe(OVRIGA);
		expect(toDistrictListId(OVRIGA)).toBe('ovriga');
	});

	it('round-trips a real district', () => {
		expect(toDistrictId(10)).toBe(10);
		expect(toDistrictListId(10)).toBe(10);
	});

	it('copes with a numeric id arriving as a string', () => {
		expect(toDistrictId('10')).toBe(10);
	});
});
