/**
 * Fetch public kèo listings from Vmito homepage (embedded initialSessions in RSC HTML).
 *
 * Usage:
 *   node scripts/fetch-vmito-listings.js
 *   node scripts/fetch-vmito-listings.js --out data/vmito-sessions.json
 *   node scripts/fetch-vmito-listings.js --import --email you@example.com --password 'Password1!'
 *
 *   node scripts/fetch-vmito-listings.js --limit 50
 *   npm run fetch:vmito:500
 *   npm run fetch:vmito:1000
 *
 * Notes:
 * - Uses Vmito public API GET /api/sessions/public (paginated; ~1.7k+ kèo).
 * - Prefers kèo có hostPhone hợp lệ; nếu không đủ --limit thì lấy thêm kèo fallback từ Vmito.
 * - Dev/demo only. Respect Vmito terms; do not hammer their servers.
 */
import '../src/shared/config/env.js';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchVmitoListings } from './lib/vmito-parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultOut = path.join(__dirname, '../data/vmito-sessions.json');

function parseArgs(argv) {
  const args = {
    out: defaultOut,
    importMatches: false,
    baseUrl: process.env.VMITO_FETCH_URL ?? 'https://vmito.com/vi',
    email: process.env.VMITO_IMPORT_EMAIL ?? process.env.SMOKE_EMAIL,
    password: process.env.VMITO_IMPORT_PASSWORD ?? 'Password1!',
    dryRun: false,
    limit: Number(process.env.VMITO_FETCH_LIMIT) || 12,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--import') args.importMatches = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--out') args.out = path.resolve(argv[++i]);
    else if (arg === '--url') args.baseUrl = argv[++i];
    else if (arg === '--email') args.email = argv[++i];
    else if (arg === '--password') args.password = argv[++i];
    else if (arg === '--limit') args.limit = Number(argv[++i]);
  }
  return args;
}

async function login(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status !== 200 || !json.accessToken) {
    throw new Error(`Login failed (${res.status}): ${json.message ?? 'no token'}`);
  }
  return json.accessToken;
}

async function importDrafts({ drafts, token, apiBase, dryRun }) {
  const results = [];
  for (const draft of drafts) {
    if (dryRun) {
      results.push({ slug: draft.slug, status: 'dry-run', title: draft.spotCreateBody.title });
      continue;
    }
    const res = await fetch(`${apiBase}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(draft.spotCreateBody),
    });
    const json = await res.json().catch(() => ({}));
    results.push({
      slug: draft.slug,
      status: res.status,
      matchId: json.match?.matchId ?? null,
      message: json.message ?? json.error,
    });
    if (res.status >= 500) {
      throw new Error(`Import stopped on 500 for ${draft.slug}: ${json.message}`);
    }
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`Fetching up to ${args.limit} Vmito kèo ...`);
  const payload = await fetchVmitoListings({ limit: args.limit });

  await mkdir(path.dirname(args.out), { recursive: true });
  await writeFile(args.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(
    `Saved ${payload.count}/${payload.requestedLimit} sessions ` +
      `(${payload.eligibleCount} sync-eligible, Vmito total ~${payload.totalAvailableOnVmito ?? '?'}) ` +
      `-> ${args.out}`,
  );

  const preview = payload.spotDrafts.slice(0, 5).map((row) => ({
    slug: row.slug,
    title: row.spotCreateBody.title,
    hostPhone: row.hostPhone || null,
    syncEligible: row.syncEligible,
    venue: row.spotCreateBody.venueName,
    startsAt: row.spotCreateBody.startsAt,
    feeType: row.spotCreateBody.feeType,
    priceMin: row.spotCreateBody.priceMin,
    priceMax: row.spotCreateBody.priceMax,
    cityResolved: row.cityResolved,
  }));
  console.log('\nPreview (spot drafts):');
  console.log(JSON.stringify(preview, null, 2));

  if (!args.importMatches) return;

  const apiBase = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
  if (!args.email) {
    throw new Error('Import requires --email or VMITO_IMPORT_EMAIL');
  }
  console.log(`\nImporting ${payload.spotDrafts.length} kèo to ${apiBase} ...`);
  const token = await login(apiBase, args.email, args.password);
  const importResults = await importDrafts({
    drafts: payload.spotDrafts,
    token,
    apiBase,
    dryRun: args.dryRun,
  });
  console.log(JSON.stringify(importResults, null, 2));
  const failed = importResults.filter((row) => row.status !== 201 && row.status !== 'dry-run');
  if (failed.length) {
    console.warn(`Import completed with ${failed.length} non-201 responses (occupancy/validation).`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
