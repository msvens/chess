import { describe, expect, it } from 'vitest';
import type { ClubDTO } from '$lib/api';
import { filterClubs } from './organizations.svelte';

// Minimal fixtures — only the fields filterClubs actually reads. The real DTOs
// carry a dozen more, none of which affect the filter.
type Membership = ClubDTO['districts'][number];

function membership(year: number, active: number, districtid = 10): Membership {
	return { districtid, year, active } as Membership;
}

function club(id: number, hasRatingPlayers = 1, districts: Membership[] = []): ClubDTO {
	return { id, name: `Club ${id}`, hasRatingPlayers, districts } as ClubDTO;
}

describe('filterClubs', () => {
	it('returns everything when no options are given', () => {
		const clubs = [club(1), club(2)];
		expect(filterClubs(clubs)).toHaveLength(2);
	});

	it('drops clubs with no rating players when asked', () => {
		const clubs = [club(1), club(2, 0)];
		expect(filterClubs(clubs, { hasRatingPlayersOnly: true }).map((c) => c.id)).toEqual([1]);
	});

	it('treats a club with no district memberships as inactive', () => {
		const clubs = [club(1, 1, [])];
		expect(filterClubs(clubs, { activeOnly: true })).toHaveLength(0);
	});

	it('judges activity by the MOST RECENT membership, not by any membership', () => {
		// A club that left its district in 2025 still carries the active 2020 row.
		// Checking `.some(active)` would wrongly keep it.
		const departed = club(1, 1, [membership(2020, 1), membership(2025, 0)]);
		const joined = club(2, 1, [membership(2020, 0), membership(2025, 1)]);

		const kept = filterClubs([departed, joined], { activeOnly: true }).map((c) => c.id);
		expect(kept).toEqual([2]);
	});

	it('applies both filters together', () => {
		const clubs = [club(1, 0, [membership(2025, 1)]), club(2, 1, [membership(2025, 1)])];
		const kept = filterClubs(clubs, { activeOnly: true, hasRatingPlayersOnly: true });
		expect(kept.map((c) => c.id)).toEqual([2]);
	});
});
