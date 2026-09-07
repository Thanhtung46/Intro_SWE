/**
 * Sync Vmito kèo into SPOT (users + matches). Skips invalid / duplicate / overlapping rows.
 *
 * Usage:
 *   npm run sync:vmito
 *   npm run sync:vmito -- --fetch
 *   npm run sync:vmito -- --dry-run
 *   npm run sync:vmito -- --file data/vmito-sessions.json
 */
import '../src/shared/config/env.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchVmitoListings, resolveVmitoCoverUrl } from './lib/vmito-parser.js';
import { syncVmitoDrafts } from './lib/vmito-sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFile = path.join(__dirname, '../data/vmito-sessions.json');
const defaultReport = path.join(__dirname, '../data/vmito-sync-report.json');

function parseArgs(argv) {
  const args = {
    file: defaultFile,
    report: defaultReport,
    fetch: false,
    dryRun: false,
    password: process.env.VMITO_IMPORT_PASSWORD ?? 'Password1!',
    vmitoUrl: process.env.VMITO_FETCH_URL ?? 'https://vmito.com/vi',
    fetchLimit: Number(process.env.VMITO_FETCH_LIMIT) || 12,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fetch') args.fetch = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--file') args.file = path.resolve(argv[++i]);
    else if (arg === '--report') args.report = path.resolve(argv[++i]);
    else if (arg === '--url') args.vmitoUrl = argv[++i];
    else if (arg === '--password') args.password = argv[++i];
    else if (arg === '--limit') args.fetchLimit = Number(argv[++i]);
  }
  return args;
}

function enrichDrafts(payload) {
  const sessionsById = new Map(
    (payload.sessions ?? []).map((session) => [session.id, session]),
  );
  return (payload.spotDrafts ?? []).map((draft) => {
    const session = sessionsById.get(draft.vmitoId);
    const coverUrl =
      (session ? resolveVmitoCoverUrl(session) : null) ??
      draft.spotCreateBody?.coverUrl ??
      null;
    const spotCreateBody =
      coverUrl && draft.spotCreateBody
        ? { ...draft.spotCreateBody, coverUrl }
        : draft.spotCreateBody;

    return {
      ...draft,
      hostId: draft.hostId ?? session?.hostId ?? draft.vmitoId,
      hostName: draft.hostName ?? session?.hostName,
      hostPhone: draft.hostPhone ?? session?.hostPhone,
      spotCreateBody,
    };
  });
}

async function loadDrafts(args) {
  if (args.fetch) {
    console.log(`Fetching Vmito (limit=${args.fetchLimit}) ...`);
    const payload = await fetchVmitoListings({ limit: args.fetchLimit });
    await mkdir(path.dirname(args.file), { recursive: true });
    await writeFile(args.file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`Saved ${payload.count} sessions -> ${args.file}`);
    return enrichDrafts(payload);
  }

  const raw = await readFile(args.file, 'utf8');
  const payload = JSON.parse(raw);
  return enrichDrafts(payload);
}

async function main() {
  const args = parseArgs(process.argv);
  const drafts = await loadDrafts(args);
  if (!drafts.length) {
    console.log('No Vmito drafts to sync.');
    return;
  }

  console.log(`Syncing ${drafts.length} kèo (dryRun=${args.dryRun}) ...`);
  const report = await syncVmitoDrafts(drafts, {
    dryRun: args.dryRun,
    password: args.password,
  });

  await mkdir(path.dirname(args.report), { recursive: true });
  await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('\n=== Sync summary ===');
  console.log(`Created: ${report.created}`);
  console.log(`Skipped: ${report.skipped}`);
  console.log(`Failed:  ${report.failed}`);
  console.log(`Hosts created: ${report.hostsCreated}`);
  console.log(`Host skills set: ${report.hostSkillsApplied?.length ?? 0}`);
  console.log(`Report: ${args.report}`);
  console.log('\nDetails:');
  console.log(JSON.stringify(report.results, null, 2));

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
