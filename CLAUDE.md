# Project Context

SvelteKit frontend for **msvens chess** — a tournament portal for Swedish chess (calendar,
live and historical results, player ratings, Elo tooling), live at chess.msvens.com. A staged
migration of the Next.js frontend (`../sthlmschack-reimagined`) to Svelte 5, ported
hardest-first. Static SPA (client-rendered), reads the Svenska Schackförbundet API via
`@msvens/schack-se-sdk` (pinned to a git tag, not npm), served behind nginx in production.

The Next app stays runnable for side-by-side diffing until cutover; its
`docs/SVELTE_MIGRATION_ASSESSMENT.md` holds the measured Next-coupling census.

# Commands

- Gate (run before committing): `pnpm check` # svelte-check + lint + test + build
- Dev server: `pnpm dev` — **port 3001**, the same port the Next app used, so the dev URL and
  the nginx upstream are unchanged. Open http://localhost:3001. Vite proxies `/api/*`; there is
  no local nginx.
- Build / preview: `pnpm build` · `pnpm preview`
- Type/component check: `pnpm check:svelte` · Lint: `pnpm lint` · Format: `pnpm format`
- Test: `pnpm test` (Vitest, jsdom) · watch: `pnpm test:watch`
- Live upstream contract tests: `pnpm test:integration` (excluded from `pnpm test`)
- Refresh org data: see `static/data/` below

# Conventions

- **Svelte 5 runes** (`$state`, `$derived`, `$effect`) for reactivity (runes mode is forced on
  in `vite.config.ts`); context-provided runes classes for cross-page state (ports the React
  contexts: Theme, Language, Organizations, GlobalPlayerCache, GlobalTournamentCache,
  GroupResults, Player).
- **Stores hold state + actions only — no `$effect`, no timers** — so they can be unit-tested by
  instantiating them directly. The root layout owns the side effects. Export the `Symbol` key so
  tests can inject a controlled instance. Module-level singletons only where a single global
  truth is required (theme and language, which `app.html`'s pre-paint script also reads).
- **API layer** lives in `src/lib/api/` — `init.ts` configures the SDK's `baseUrl` to
  `/api/chess/v1`; `index.ts` re-exports the SDK. Import via the `$lib` alias. SDK methods
  return `ApiResponse<T>` (`{ data?, error?, status }`) and **never throw** — check
  `response.data` / `response.status`.
- **Rendering**: static SPA — `ssr = false` / `prerender = false` in `src/routes/+layout.ts`,
  `adapter-static` with `fallback: 'index.html'`. Keep data fetching client-side — **no server
  `load`**, no `+page.server.ts` / `+server.ts`; under adapter-static they work in dev and
  vanish in prod.
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`), stylesheet at `src/routes/layout.css`.
  Class-based dark mode via `@variant dark (.dark &)`. **No dynamic class strings** — use
  explicit class maps for computed classes (Tailwind JIT can't see them otherwise).
  Icons: `svelte-hero-icons`.
- Use the `PageLayout` component instead of hand-rolled containers.
- All UI text goes through `$lib/translations.ts` — no inline `language === 'sv' ? … : …`.
- Routes in `src/routes/` stay thin; feature components under `src/lib/components/` grouped by
  role (`ui/`, `layout/`, then one directory per domain).
- A component is `Foo.svelte` + `Foo.svelte.test.ts`. It earns a folder when it grows several
  parts (`ui/Table/`), not merely a second file; split logic into a `.ts` sibling only when it
  has behaviour a rendered test cannot assert, and name it for what it is (`calendar.ts`),
  never `xxxLogic.ts`.
- Ported framework-agnostic tests keep their `__tests__/` layout.
- **No lint or type suppressions.** No `eslint-disable`, no `@ts-ignore` / `@ts-expect-error`.
  If a rule fires, fix the design — the rule is usually right, and when it isn't the honest move
  is to restructure rather than silence it.

# Domain rules

- Tournament status: derive via the SDK's `getTournamentStatus` — the API `state` field is
  unreliable (organizers rarely flip it, so finished events still report "registration").
- Prize categories: the encoding and player matching live in the SDK (`parsePrizeCategory`,
  `resolvePrizeMembers`). `$lib/results/prizeCategories.ts` holds presentation only —
  which types get a dropdown, their order, headings and labels.
- Club "active" status means the club's **most recent** district membership is active, not that
  any membership is — clubs keep their historical rows.

# The `/api` proxy is mandatory

SSF answers a CORS preflight with **403**, and the SDK sets `Content-Type: application/json` on
every request (including bodyless GETs), which forces one. Calling SSF directly from the browser
cannot work. Dev: the Vite proxy in `vite.config.ts`. Prod: nginx.

**Never normalise trailing slashes in either proxy.** The SSF API is inconsistent: GET endpoints
404 _with_ a trailing slash, its one POST (`/player/list/`) 404s _without_. ChessTools is the
same (`/fide/top_active/` requires the slash). The SDK emits the correct form per endpoint, so a
"helpful" proxy rewrite is the only way to break it. `src/lib/api/__tests__/upstream.integration.test.ts`
guards these assumptions on a daily schedule.

# `static/data/`

Club and district data is static JSON loaded once at startup, then queried synchronously.
`organizations-all.json` (~19 MB), `clubs-by-district.json` and `districts.json` are
**gitignored** — regenerated on deploy. The geocode caches (`geocodes.json`,
`club-geocodes.json`) **are** tracked: they are expensive to rebuild.

# Deployment

Production topology and the nginx configuration this SPA needs are documented in
`docs/DEPLOYMENT.md`. The live configs live in the separate `configs` repo and are applied
from there.

# Behavior Rules

- Ask before assuming when requirements are ambiguous
- Write minimum code to solve the stated problem — no preemptive abstraction
- Only modify files and functions directly involved in the current task
- Say "I'm not sure" when uncertain rather than confabulating

# Committing

1. Run `pnpm check` — abort and report if anything fails.
2. Review `git status` / diffs and propose a logical commit grouping (one commit if cohesive,
   split distinct workstreams).
3. Commit only when explicitly asked. No Claude attribution / `Co-Authored-By`. Push only when
   asked.

## SDK test-data corpus

The SDK ships a curated catalogue of **real** SSF tournaments and groups that illustrate specific
data shapes and anomalies — a blitz rating-chain event, a `0 - 0` double forfeit, `sex = 2`
(unrecorded), the senior 59-year-old boundary. Use it to find a real example to verify a feature
against, rather than hunting for one.

```ts
import { findCorpusEntries, getCorpusEntry } from '@msvens/schack-se-sdk/corpus';

findCorpusEntries({ tags: ['prize-senior'] }); // match ANY tag
findCorpusEntries({ anomaly: true }); // documented upstream weirdness
```

It's a catalogue of **ids and notes, not fixtures** — entries point at live data, so it gives you
targets to check by hand, not offline payloads. Every entry carries an `observed` date because
SSF data drifts. **Dev-only**: import from `@msvens/schack-se-sdk/corpus` directly, never via
`$lib/api`.
