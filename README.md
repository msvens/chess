# msvens chess

Tournament portal for Swedish chess — tournament calendar, live and historical results, player
ratings and Elo tooling. Live at [chess.msvens.com](https://chess.msvens.com).

SvelteKit static SPA (Svelte 5 + Tailwind CSS 4 + TypeScript), reading the Svenska
Schackförbundet API through [`@msvens/schack-se-sdk`](https://github.com/msvens/schack-se-sdk).

## Development

```bash
pnpm install
pnpm data:clubs   # club and district data, needed before the first `pnpm dev`
pnpm dev          # http://localhost:3001
```

The club and district data (`organizations-all.json`, `clubs-by-district.json`,
`districts.json` in `static/data/`) is downloaded, not tracked, and `pnpm dev` won't start
without it. The geocode files beside it are tracked, since they are slow to rebuild. See
[`scripts/README.md`](scripts/README.md).

The dev server proxies `/api/chess/v1` to the SSF API — in production nginx does the same. The
proxy is required: SSF rejects CORS preflights, and the SDK forces one on every request.
Likewise `/api/sthlm/v1` goes to the Stockholms Schackförbund API
(https://verktyg.stockholmsschack.se/api/v1, e.g. `standings/jgp`), which sends no CORS headers.

FIDE data comes from [mfide](https://github.com/msvens/mfide), which needs an API key. Production
nginx serves it under `/api/fide` and adds the key, so the dev server forwards `/api/fide` to
https://chess.msvens.com and no key or local mfide is needed. To use a local stack instead, set
`FIDE_PROXY_TARGET` (e.g. `FIDE_PROXY_TARGET=http://localhost:8061 pnpm dev`).

The SDK is pinned to a git tag in `package.json`. After bumping it, restart the dev server with
`pnpm dev --force`: a running server keeps serving the version it pre-bundled.

```bash
pnpm check              # svelte-check + lint + test + build — the gate before committing
pnpm test               # Vitest (jsdom)
pnpm test:integration   # live contract tests against the SSF API, not part of `pnpm test`
pnpm build              # static output in build/
```

## License

[MIT](LICENSE)
