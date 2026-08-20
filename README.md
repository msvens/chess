# msvens chess

Tournament portal for Swedish chess — tournament calendar, live and historical results, player
ratings and Elo tooling. Live at [chess.msvens.com](https://chess.msvens.com).

SvelteKit static SPA (Svelte 5 + Tailwind CSS 4 + TypeScript), reading the Svenska
Schackförbundet API through [`@msvens/schack-se-sdk`](https://github.com/msvens/schack-se-sdk).

> **Status: migration in progress.** This is a staged port of
> [`sthlmschack-reimagined`](https://github.com/msvens/sthlmschack-reimagined) (Next.js + React),
> which remains the deployed app until cutover.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3001
```

Port 3001 matches the Next app, so the dev URL and the nginx upstream are unchanged.

The dev server proxies `/api/chess/v1` to the SSF API and `/api/chesstools` to ChessTools —
in production nginx does the same. The proxy is required: SSF rejects CORS preflights, and the
SDK forces one on every request.

Club and district data is static JSON in `static/data/`, untracked and fetched separately.

```bash
pnpm check        # svelte-check + lint + test + build — the gate before committing
pnpm test         # Vitest (jsdom)
pnpm build        # static output in build/
```

## License

MIT
