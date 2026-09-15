# Deployment

How this app is served in production, and the nginx configuration it needs.

The live configuration lives in the separate `configs` repo
(`providers/upcloud/mellowtech/`) and is applied from there. This document is the
reference for _what_ that configuration has to say and _why_; it is not applied
automatically.

> **Status: not yet cut over.** chess.msvens.com still serves the Next app
> (`chess.service` → `pnpm start` on :3001). Nothing below should be applied until the
> static bundle is actually in `/usr/share/chess` — applied early it takes the site down.

## Topology

Today (Next):

```
chess.msvens.com → nginx (TLS + proxy_pass) → localhost:3001 (chess.service, Node)
                 → Next route handlers → member.schack.se
```

After cutover (this app):

```
chess.msvens.com → nginx ─┬─ /                 → static bundle in /usr/share/chess
                          ├─ /api/chess/v1/    → member.schack.se
                          └─ /api/chesstools/  → api.chesstools.org
```

There is no application server. `chess.service` is removed; nginx serves the files and
terminates both API proxies itself.

## Why the proxy is not optional

SSF answers a CORS preflight with **403**, and the SDK sets `Content-Type:
application/json` on every request — including bodyless GETs — which forces one. A
browser therefore cannot call SSF directly. `curl` can, because curl never preflights,
which is why this looks like it should work until you try it from a page.

`src/lib/api/__tests__/upstream.integration.test.ts` asserts this daily. If that
preflight ever stops being a 403, a proxy-free build becomes worth reconsidering.

## Trailing slashes — the thing that silently breaks everything

The SSF API is inconsistent:

- GET endpoints **404 with** a trailing slash
- its single POST (`/player/list/`) **404s without** one
- ChessTools `/fide/top_active/` **requires** the slash

The SDK already emits the correct form per endpoint (of 21 endpoint templates, exactly
one ends in a slash). So the hazard is never about adding slashes — it is solely that
**the proxy must not normalise the path**. That is what `skipTrailingSlashRedirect: true`
was doing in the old `next.config.ts`.

Use the prefix-substitution form of `proxy_pass` (trailing slash on the target). It
substitutes the matched location prefix and passes the remainder through byte-for-byte.
Do not add `rewrite` rules, and do not touch `merge_slashes`.

Verify from the host after any change — not against upstream:

```bash
# must be 200
curl -so /dev/null -w '%{http_code}\n' https://chess.msvens.com/api/chess/v1/organisation/districts
# must be 404 — if this returns 200, something normalised the path
curl -so /dev/null -w '%{http_code}\n' https://chess.msvens.com/api/chess/v1/organisation/districts/
```

## nginx

`proxy_ssl_server_name on` is **required**: without SNI the TLS handshake to
member.schack.se fails outright.

```nginx
    root /usr/share/chess;

    location /api/chess/v1/ {
        proxy_pass https://member.schack.se/public/api/v1/;
        proxy_ssl_server_name on;
        proxy_set_header Host member.schack.se;
    }

    location /api/chesstools/ {
        proxy_pass https://api.chesstools.org/;
        proxy_ssl_server_name on;
        proxy_set_header Host api.chesstools.org;
    }

    # Vite content-addresses everything under _app/immutable.
    location /_app/immutable/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Rewritten daily by chess-org-update.service, and ~19MB — short cache, gzipped.
    location /data/ {
        expires 1h;
        gzip on;
        gzip_types application/json;
    }

    # SPA fallback. Nine route segments are dynamic ([tournamentId], [groupId],
    # [memberId], [teamId], [id]), so a deep link must serve index.html and let the
    # client router resolve it.
    location / {
        try_files $uri $uri/ /index.html;
    }
```

The TLS/ACME server blocks are unchanged from the current `chess.conf`.

### Verified

The proxy blocks and SPA fallback above were exercised against a local nginx serving a
real `pnpm build` output. Confirmed:

- all four trailing-slash pairs behave as tabulated (200 without, 404 with)
- deep links to `/results/16642/12345/team/7`, `/organizations/clubs/999`,
  `/players/408550`, `/print/16642/12345` all serve `index.html`
- real assets still resolve, and a missing asset 404s instead of falling through to
  `index.html`
- both upstreams return live data through the proxies, query strings intact

## systemd

- **`chess.service`** — remove. No Node runtime remains. Keep it installed-but-stopped
  for the first week as the rollback path.
- **`chess-org-update.service` / `.timer`** — keep the 06:00 daily run, but **repoint it**.
  It currently runs `node scripts/fetch-organizations.js` with `WorkingDirectory=/usr/share/chess`,
  writing into a `public/data/` that the Node server served live. A static build copies
  `static/` into `build/` at _build_ time, so the script must instead write directly into
  the served root (`/usr/share/chess/data/`). Miss this and the daily club/district
  refresh silently stops — the site keeps working, on frozen data.

## Deploy

The contact page's Formspree endpoint is **inlined at build time**, so it must be in the
environment of the machine that runs `pnpm build`, not on the host. Put it in a
gitignored `.env.local` in the repo root:

```bash
VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/<form-id>
```

It replaces the Next app's `NEXT_PUBLIC_FORMSPREE_ENDPOINT`, which lived in
`/usr/share/chess/.env.local` on the host and is no longer read. A build without it still
succeeds, and the contact page shows an "under construction" placeholder instead of the
form, so check the page after deploying.

The map tiles need a CARTO basemaps key, also inlined at build time. It goes in
`.env.production.local`, which only `vite build` reads, **not** in `.env.local`:

```bash
VITE_CARTO_KEY=<key>
```

The key is referrer-restricted to `*.msvens.com`, and CARTO answers a keyed tile from any
other origin, localhost included, with a 403 and no map at all. `.env.local` is read by the
dev server too, so a key there breaks the maps locally. Without the key, both maps still work
but show CARTO's "API KEY REQUIRED" watermark. The value is deliberately not in this repo,
which is public; it lives with the configs.

Build, ship the directory, reload:

```bash
pnpm install --frozen-lockfile
pnpm check          # gate: svelte-check + lint + test + build
rsync -a --delete build/ <host>:/usr/share/chess/
# then on the host:
sudo nginx -t && sudo systemctl reload nginx
```

`--delete` is safe for the bundle but **must not remove `/usr/share/chess/data/`** once
the org-update service writes there — exclude it, or keep the data outside the rsync
target.

## Rollback

Keep `chess.service` and the previous `chess.conf` available for the first week.
Reverting is: restore the old config symlink, `systemctl start chess`, reload nginx.
