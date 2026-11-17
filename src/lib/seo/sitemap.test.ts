import { describe, expect, it } from 'vitest';
import type { ClubDTO, TournamentDto } from '$lib/api';
import { FIXED_PAGES, sitemapEntries, toSitemapXml } from './sitemap';

const INDIVIDUAL = 3;
const GRAND_PRIX = 7;

const club = (id: number, active: boolean) =>
	({ id, districts: [{ year: 2026, active: active ? 1 : 0 }] }) as unknown as ClubDTO;

const tournament = (id: number, groups: number[], over: Partial<TournamentDto> = {}) =>
	({
		id,
		type: INDIVIDUAL,
		rootClasses: [
			{
				classID: 1,
				groups: groups.slice(0, 1).map((g) => ({ id: g })),
				subClasses: [
					{ classID: 2, groups: groups.slice(1).map((g) => ({ id: g })), subClasses: [] }
				]
			}
		],
		...over
	}) as unknown as TournamentDto;

const paths = (sources: Parameters<typeof sitemapEntries>[0]) =>
	sitemapEntries(sources).map((e) => e.path);

describe('sitemapEntries', () => {
	it('lists the fixed pages first, with nothing else when given nothing', () => {
		expect(paths({})).toEqual([...FIXED_PAGES]);
	});

	it('adds every district and only the active clubs', () => {
		const result = paths({ districts: [{ id: 5807 }], clubs: [club(1, true), club(2, false)] });
		expect(result).toContain('/organizations/districts/5807');
		expect(result).toContain('/organizations/clubs/1');
		expect(result).not.toContain('/organizations/clubs/2');
	});

	it('adds every group of a tournament, subclasses included, but not the tournament page', () => {
		const result = paths({ tournaments: [tournament(7457, [19704, 19705])] });
		expect(result).toContain('/results/7457/19704');
		expect(result).toContain('/results/7457/19705');
		expect(result).not.toContain('/results/7457');
	});

	it('leaves out Grand Prix series, whose results are not on this site', () => {
		const result = paths({ tournaments: [tournament(6972, [18866], { type: GRAND_PRIX })] });
		expect(result.some((p) => p.startsWith('/results/'))).toBe(false);
	});

	it('lists a tournament once when both searches return it, keeping the dated copy', () => {
		const entries = sitemapEntries({
			tournaments: [
				tournament(1, [10]),
				tournament(1, [10], { latestUpdated: '2026-11-15 19:20:06.000' } as Partial<TournamentDto>)
			]
		});
		const groups = entries.filter((e) => e.path === '/results/1/10');
		expect(groups).toEqual([{ path: '/results/1/10', lastmod: '2026-11-15' }]);
	});
});

describe('toSitemapXml', () => {
	it('writes a urlset with absolute addresses and lastmod where known', () => {
		const xml = toSitemapXml([{ path: '/' }, { path: '/results/1/10', lastmod: '2026-11-15' }]);
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml).toContain('<url><loc>https://chess.msvens.com/</loc></url>');
		expect(xml).toContain(
			'<url><loc>https://chess.msvens.com/results/1/10</loc><lastmod>2026-11-15</lastmod></url>'
		);
	});

	it('escapes what XML would misread', () => {
		expect(toSitemapXml([{ path: '/a?b=1&c=2' }])).toContain('/a?b=1&amp;c=2');
	});
});
