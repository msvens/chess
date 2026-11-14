import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJgpStandings, parseJgpStandings } from '../sthlm';

const wireRow = (over: Record<string, unknown> = {}) => ({
	placement: 1,
	member_id: 546353,
	name: 'Lo Ljungros',
	birth_year: 2009,
	club: 'Kristallens SK',
	tournaments: { '6540': 20, '6685': 0 },
	total_points: 20,
	...over
});

describe('parseJgpStandings', () => {
	it('maps a row to the app shape, keeping a 0 apart from a tournament not played', () => {
		const parsed = parseJgpStandings({
			last_updated: '2026-11-13T19:32:59+00:00',
			tournament_ids: [6544, 6540, 6685],
			standings: [wireRow()]
		});

		expect(parsed.lastUpdated).toBe('2026-11-13T19:32:59+00:00');
		expect(parsed.tournamentIds).toEqual([6544, 6540, 6685]);
		const [row] = parsed.tables[0].rows;
		expect(row).toMatchObject({
			placement: 1,
			memberId: 546353,
			name: 'Lo Ljungros',
			birthYear: 2009,
			club: 'Kristallens SK',
			total: 20
		});
		expect(row.points[6540]).toBe(20);
		expect(row.points[6685]).toBe(0);
		expect(row.points[6544]).toBeUndefined();
	});

	it('makes the girls flat list one unlabelled table', () => {
		const parsed = parseJgpStandings({
			last_updated: '',
			tournament_ids: [],
			standings: [wireRow(), wireRow({ member_id: 2, placement: 2 })]
		});
		expect(parsed.tables).toHaveLength(1);
		expect(parsed.tables[0].label).toBe('');
		expect(parsed.tables[0].rows).toHaveLength(2);
	});

	it('orders age classes by birth year, which parsing alone does not', () => {
		// As delivered. JSON.parse hands the keys back as 2013, 2014, 2006-2009, …
		const parsed = parseJgpStandings(
			JSON.parse(
				'{"last_updated":"","tournament_ids":[],"standings":{' +
					'"2006-2009":[],"2010-2012":[],"2013":[],"2014":[],"2018 onward":[]}}'
			)
		);
		expect(parsed.tables.map((table) => table.label)).toEqual([
			'2006-2009',
			'2010-2012',
			'2013',
			'2014',
			'2018 onward'
		]);
	});

	it('keeps the official placement even when totals tie', () => {
		const parsed = parseJgpStandings({
			last_updated: '',
			tournament_ids: [],
			standings: [
				wireRow({ member_id: 1, placement: 1, total_points: 50 }),
				wireRow({ member_id: 2, placement: 2, total_points: 50 })
			]
		});
		expect(parsed.tables[0].rows.map((row) => row.placement)).toEqual([1, 2]);
	});
});

describe('getJgpStandings', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('asks the proxy for each division, without a trailing slash', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ last_updated: '', tournament_ids: [], standings: [] }))
			);
		vi.stubGlobal('fetch', fetchMock);

		await getJgpStandings('open');
		await getJgpStandings('girls');

		expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
			'/api/sthlm/v1/standings/jgp',
			'/api/sthlm/v1/standings/flickornas'
		]);
	});

	it('returns an HTTP failure as an error rather than throwing', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })));
		expect(await getJgpStandings('open')).toEqual({ error: 'HTTP 502', status: 502 });
	});

	it('returns a network failure as status 0', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
		expect(await getJgpStandings('open')).toEqual({ error: 'Failed to fetch', status: 0 });
	});
});
