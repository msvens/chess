#!/usr/bin/env npx tsx
/**
 * Sitemap Generator
 *
 * Writes the sitemap from the organisation data in `static/data/` and the
 * current tournaments from SSF: the coming list (ongoing and upcoming) plus
 * those with results updated in the last 30 days. What goes in, and the XML,
 * is `src/lib/seo/sitemap.ts`.
 *
 * Best-effort, so it can never break a build: if the org data is missing, or
 * SSF does not answer within the timeout, it warns and writes the sitemap
 * without those parts.
 *
 * Runs automatically: as part of prebuild, writing `static/sitemap.xml`.
 * Runs on its own:     pnpm generate:sitemap --out /path/to/served/sitemap.xml
 *                      e.g. daily on the server, so the 30-day window moves
 *                      between deploys. Written to a temp file and renamed, so
 *                      a half-written sitemap is never served.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
	TournamentService,
	type ClubDTO,
	type DistrictDTO,
	type TournamentDto
} from '@msvens/schack-se-sdk';
import { sitemapEntries, toSitemapXml } from '../src/lib/seo/sitemap';

const ROOT_DIR = path.join(import.meta.dirname, '..');
const ORG_DATA = path.join(ROOT_DIR, 'static', 'data', 'organizations-all.json');
const DEFAULT_OUT = path.join(ROOT_DIR, 'static', 'sitemap.xml');

/** Absolute, like the live tests: there is no browser proxy at build time. */
const SSF_BASE = 'https://member.schack.se/public/api/v1';
const TIMEOUT_MS = 30_000;
const UPDATED_DAYS = 30;

function outPath(): string {
	const at = process.argv.indexOf('--out');
	return at >= 0 && process.argv[at + 1] ? path.resolve(process.argv[at + 1]) : DEFAULT_OUT;
}

function readOrganizations(): { districts: DistrictDTO[]; clubs: ClubDTO[] } {
	if (!fs.existsSync(ORG_DATA)) {
		console.warn(
			`  ⚠ ${path.relative(ROOT_DIR, ORG_DATA)} missing: no districts or clubs in the sitemap`
		);
		return { districts: [], clubs: [] };
	}
	const data = JSON.parse(fs.readFileSync(ORG_DATA, 'utf-8')) as {
		districts: DistrictDTO[];
		clubsByDistrict: { clubs: ClubDTO[] }[];
	};
	return { districts: data.districts, clubs: data.clubsByDistrict.flatMap((d) => d.clubs) };
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

async function readTournaments(): Promise<TournamentDto[]> {
	const service = new TournamentService(SSF_BASE, TIMEOUT_MS);
	const today = new Date();
	const from = new Date(today);
	from.setDate(from.getDate() - UPDATED_DAYS);

	const [coming, updated] = await Promise.all([
		service.searchComingTournaments(),
		service.searchUpdatedTournaments(`${isoDay(from)}T00:00:00`, `${isoDay(today)}T23:59:59`)
	]);
	// Each search counts on its own: one failing still leaves the other's tournaments.
	for (const [name, response] of [
		['coming list', coming],
		['updated search', updated]
	] as const) {
		if (!response.data) {
			console.warn(`  ⚠ SSF ${name} failed (${response.status}: ${response.error}): left out`);
		}
	}
	return [...(coming.data ?? []), ...(updated.data ?? [])];
}

async function main() {
	const out = outPath();
	const { districts, clubs } = readOrganizations();
	const tournaments = await readTournaments().catch((err: unknown) => {
		console.warn(`  ⚠ SSF unreachable (${String(err)}): no tournaments in the sitemap`);
		return [];
	});

	const entries = sitemapEntries({ districts, clubs, tournaments });
	const temp = `${out}.tmp`;
	fs.writeFileSync(temp, toSitemapXml(entries));
	fs.renameSync(temp, out);

	const results = entries.filter((e) => e.path.startsWith('/results/')).length;
	console.log(
		`✓ Sitemap: ${entries.length} addresses (${results} groups) → ${path.relative(process.cwd(), out)}`
	);
}

main();
