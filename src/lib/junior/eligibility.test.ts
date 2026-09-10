import { describe, expect, it } from 'vitest';
import type { ClubDTO } from '$lib/api';
import type { JgpSeason } from '$lib/data/jgp/types';
import type { JgpPlayerResult } from './jgpEngine';
import { STOCKHOLM_DISTRICT_ID, stockholmEligibility } from './eligibility';

const season = (over: Partial<JgpSeason> = {}): JgpSeason =>
	({
		year: 2026,
		division: 'open',
		scoring: 'ladder',
		tournaments: [],
		dispensations: [],
		clubExceptions: [],
		...over
	}) as JgpSeason;

const row = (over: Partial<JgpPlayerResult> = {}): JgpPlayerResult =>
	({ memberId: 1, clubId: 100, ...over }) as JgpPlayerResult;

const club = (districts: { districtid: number; active: number }[]) => ({ districts }) as ClubDTO;

describe('stockholmEligibility', () => {
	const stockholm = club([{ districtid: STOCKHOLM_DISTRICT_ID, active: 1 }]);
	const elsewhere = club([{ districtid: 1234, active: 1 }]);

	it('accepts a club in the Stockholm district', () => {
		const eligible = stockholmEligibility(season(), () => stockholm);
		expect(eligible(row())).toBe(true);
	});

	it('rejects a club in another district', () => {
		const eligible = stockholmEligibility(season(), () => elsewhere);
		expect(eligible(row())).toBe(false);
	});

	it('rejects a lapsed Stockholm membership', () => {
		// Clubs keep their historical district rows; only an active one counts.
		const lapsed = club([{ districtid: STOCKHOLM_DISTRICT_ID, active: 0 }]);
		const eligible = stockholmEligibility(season(), () => lapsed);
		expect(eligible(row())).toBe(false);
	});

	it('rejects an unknown club', () => {
		const eligible = stockholmEligibility(season(), () => undefined);
		expect(eligible(row())).toBe(false);
	});

	it('accepts a listed exception whatever their club says', () => {
		// A secondary Stockholm membership, which the results API does not expose.
		const withException = season({
			clubExceptions: [{ memberId: 7, name: 'Anna', stockholmClub: 'SK Rockaden' }]
		});
		const eligible = stockholmEligibility(withException, () => elsewhere);
		expect(eligible(row({ memberId: 7 }))).toBe(true);
		expect(eligible(row({ memberId: 8 }))).toBe(false);
	});
});
