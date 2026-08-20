#!/usr/bin/env node
/**
 * Predev guard. The downloadable org data (static/data/organizations-all.json
 * et al.) is not tracked in git, so a fresh clone has none until it's fetched.
 * The app fetches organizations-all.json at runtime, so without it the org
 * pages, club lookups, and maps render empty. Fail fast with a clear message
 * rather than letting `pnpm dev` start a half-broken app.
 */
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED = path.join(import.meta.dirname, '..', 'static', 'data', 'organizations-all.json');

if (!fs.existsSync(REQUIRED)) {
	console.error('\n  ✖ Missing static/data/organizations-all.json\n');
	console.error('  The downloadable org data is not tracked in git. Fetch it once:\n');
	console.error('      pnpm data:clubs\n');
	console.error('  (downloads districts/clubs from schack.se and refreshes the geocode caches)\n');
	process.exit(1);
}
