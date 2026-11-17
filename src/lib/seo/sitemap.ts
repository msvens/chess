/**
 * The sitemap: which addresses to point search engines at, and the XML for it.
 *
 * Pure, so it can be tested, and free of `$lib` runtime imports, so the
 * build-time script (`scripts/generate-sitemap.ts`) can run it under Node. That
 * is why `isGrandPrix` comes from the SDK package directly rather than
 * `$lib/api`, which also configures the browser's proxy base.
 *
 * A sitemap is a list of hints, not the index: a page Google has found stays
 * indexed after it drops out of here. So tournaments are only the current ones —
 * ongoing, upcoming and recently updated — and players are left out entirely;
 * Google reaches the rest through links.
 */
import { isGrandPrix } from '@msvens/schack-se-sdk';
import type { ClubDTO, DistrictDTO, TournamentClassDto, TournamentDto } from '$lib/api';
import { filterClubs } from '../organizations/clubFilter';

export const SITE_URL = 'https://chess.msvens.com';

/** Pages with fixed addresses. Redirect-only routes (`/guide`, `/junior`, …) are left out. */
export const FIXED_PAGES = [
	'/',
	'/calendar',
	'/today',
	'/results',
	'/players',
	'/organizations',
	'/organizations/ssf',
	'/junior/stockholms-jgp',
	'/guide/formats',
	'/guide/elo/basics',
	'/guide/elo/calculator',
	'/guide/elo/fine-print',
	'/guide/elo/formula',
	'/about',
	'/contact',
	'/changelog'
] as const;

export interface SitemapEntry {
	/** Path from the site root, e.g. `/results/7457/19704`. */
	path: string;
	/** `YYYY-MM-DD`, when known. */
	lastmod?: string;
}

export interface SitemapSources {
	districts?: Pick<DistrictDTO, 'id'>[];
	clubs?: ClubDTO[];
	tournaments?: TournamentDto[];
}

function groupIds(classes: TournamentClassDto[] | null | undefined): number[] {
	return (classes ?? []).flatMap((c) => [
		...(c.groups ?? []).map((g) => g.id),
		...groupIds(c.subClasses)
	]);
}

/** `2026-11-15 19:20:06.000` → `2026-11-15`; anything else is left out. */
function dateOf(value: string | null | undefined): string | undefined {
	const day = value?.slice(0, 10);
	return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined;
}

/**
 * Every address, in a stable order: fixed pages, districts, active clubs, then
 * each group of each tournament. A tournament listed twice (the coming list and
 * the updated search overlap) keeps the copy with a `latestUpdated`.
 */
export function sitemapEntries({
	districts = [],
	clubs = [],
	tournaments = []
}: SitemapSources): SitemapEntry[] {
	const byId = new Map<number, TournamentDto>();
	for (const tournament of tournaments) {
		const existing = byId.get(tournament.id);
		if (!existing || (!existing.latestUpdated && tournament.latestUpdated)) {
			byId.set(tournament.id, tournament);
		}
	}

	return [
		...FIXED_PAGES.map((path) => ({ path })),
		...districts.map((district) => ({ path: `/organizations/districts/${district.id}` })),
		...filterClubs(clubs, { activeOnly: true }).map((club) => ({
			path: `/organizations/clubs/${club.id}`
		})),
		// A series' pages point to schack.se; its results are not here to find.
		...[...byId.values()]
			.filter((tournament) => !isGrandPrix(tournament.type))
			.flatMap((tournament) => {
				const lastmod = dateOf(tournament.latestUpdated);
				return groupIds(tournament.rootClasses).map((groupId) => ({
					path: `/results/${tournament.id}/${groupId}`,
					...(lastmod ? { lastmod } : {})
				}));
			})
	];
}

const escapeXml = (text: string) =>
	text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

export function toSitemapXml(entries: SitemapEntry[]): string {
	const urls = entries.map(({ path, lastmod }) => {
		const loc = `<loc>${escapeXml(`${SITE_URL}${path}`)}</loc>`;
		return lastmod ? `  <url>${loc}<lastmod>${lastmod}</lastmod></url>` : `  <url>${loc}</url>`;
	});
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls,
		'</urlset>',
		''
	].join('\n');
}
