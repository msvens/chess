# Scripts

Data-generation and release tooling. Everything here runs on demand — none of it is
part of the app bundle.

| Script                   | Command                   | Output                           |
| ------------------------ | ------------------------- | -------------------------------- |
| `check-data.js`          | (runs via `predev`)       | — (guard only)                   |
| `fetch-organizations.js` | `pnpm data:clubs`         | `static/data/*.json`             |
| `build-geocodes.ts`      | `pnpm geocode:build`      | `static/data/geocodes.json`      |
| `geocode-clubs.ts`       | `pnpm geocode:clubs`      | `static/data/club-geocodes.json` |
| `check-translations.ts`  | `pnpm translations:check` | — (report only)                  |
| `generate-changelog.ts`  | `pnpm generate:changelog` | `src/lib/data/changelog.ts`      |
| `release.sh`             | `pnpm release X.Y.Z`      | CHANGELOG promotion + git tag    |

## Organization data

`pnpm data:clubs` fetches all districts and their clubs from the SSF API (~30
districts, ~14,500 clubs, ~1.5s) and writes three files to `static/data/`:
`districts.json`, `clubs-by-district.json`, and `organizations-all.json` (~19 MB
pretty, ~1 MB gzipped) — the last being what the app actually loads.

**These three are gitignored.** They are regenerable and would churn entirely on
every refresh, so they are not committed; a fresh clone has none until you run
`pnpm data:clubs`. `predev` guards this — `pnpm dev` fails fast with instructions
rather than starting an app whose club lookups all render `Org 1234`.

In production the daily `chess-org-update.service` timer regenerates them on the
host. Under a static build the script must write into the _served_ directory, not a
source one — `static/` is copied into the bundle at build time, so writing there
would never reach the live site.

Districts and clubs change a few times a year, so re-running is rarely urgent.

## Geocodes

The two geocode caches **are** committed, unlike the org data: they are the output
of rate-limited third-party lookups and expensive to rebuild.

- `pnpm geocode:build` — city-level coordinates from the GeoNames dump, for the
  calendar map.
- `pnpm geocode:clubs` — street-level coordinates per club, for the club map.
  Negative results are cached so they aren't retried; transient HTTP failures are
  not, so they retry next run. `GEOCODE_LIMIT=40` caps new lookups for a quick
  test; `GEOCODE_RETRY_FAILED=1` re-attempts past no-matches.

Both require `pnpm data:clubs` to have run first.

## Translations

`pnpm translations:check` scans `.svelte` and `.ts` sources for translation key
usage and compares against `src/lib/translations.ts`, reporting keys that are used
but undefined, and en/sv parity gaps. Note the extension list — this app's UI text
lives in `.svelte` components, which is the one thing that needed adapting from the
Next version of this script.

## Releases

`pnpm release X.Y.Z` promotes `## [Unreleased]` in `CHANGELOG.md`, regenerates
`src/lib/data/changelog.ts` (which the `/changelog` page renders), commits, tags,
and prints the push command — it does not push. Releases are CHANGELOG + git tag
only; `package.json`'s version is left alone.
