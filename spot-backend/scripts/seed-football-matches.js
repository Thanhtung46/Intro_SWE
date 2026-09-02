/**
 * Seed ~50 demo FOOTBALL kèo (HCM venues + coords). Dev/demo only —
 * not live scrape (Vmito has no football public feed).
 *
 *   npm run seed:football
 *   npm run seed:football -- --count 50 --dry-run
 *   npm run reset:football
 */
import '../src/shared/config/env.js';
import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createMatch } from '../src/domains/matchmaking/service/match.service.js';
import * as userRepository from '../src/domains/auth/repository/user.repository.js';
import * as userSportSkillRepository from '../src/domains/auth/repository/user-sport-skill.repository.js';
import { hashPassword } from '../src/shared/utils/password.js';
import {
  USER_ROLES,
  USER_STATUSES,
} from '../src/shared/constants/auth.js';
import { AppError } from '../src/shared/middleware/errorHandler.js';
import pool from '../src/shared/database/pool.js';
import {
  prepareSpotCreateBody,
  findVenueTimeOverlap,
  dedupeDraftsByVenueTime,
} from './lib/vmito-sync.js';
import {
  buildFootballSeedDrafts,
  footballSeedTag,
} from './lib/football-seed-catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PASSWORD = 'Password1!';
const defaultReport = path.join(__dirname, '../data/football-seed-report.json');

function parseArgs(argv) {
  const args = {
    count: 50,
    dryRun: false,
    password: process.env.FOOTBALL_SEED_PASSWORD ?? DEFAULT_PASSWORD,
    report: defaultReport,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--count') args.count = Number(argv[++i]) || 50;
    else if (arg === '--password') args.password = argv[++i];
    else if (arg === '--report') args.report = path.resolve(argv[++i]);
  }
  return args;
}

function sanitizeName(value) {
  return (
    String(value || '')
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'Football Host'
  );
}

function importEmailForHost(hostId) {
  const token = hostId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-24) || 'host';
  return `football.${token}@import.spot.local`;
}

function syntheticPhoneForHost(hostId) {
  const digest = createHash('sha256').update(`fb:${hostId}`).digest('hex');
  return `08${digest.replace(/\D/g, '').slice(0, 8)}`;
}

async function findSeededMatch(client, slug) {
  const { rows } = await client.query(
    `SELECT match_id, host_user_id, title
     FROM schema_matchmaking.matches
     WHERE notes ILIKE $1
     LIMIT 1`,
    [`%${footballSeedTag(slug)}%`],
  );
  return rows[0] || null;
}

async function ensureFootballHost(
  client,
  { hostId, hostName, hostPhone },
  { password },
) {
  const phoneDigits = String(hostPhone ?? '').replace(/\D/g, '');
  const phoneNumber =
    /^0\d{9}$/.test(phoneDigits) ? phoneDigits : syntheticPhoneForHost(hostId);
  const email = importEmailForHost(hostId);
  const fullName = sanitizeName(hostName);

  let user =
    (await userRepository.findByEmail(client, email)) ||
    (await userRepository.findByPhone(client, phoneNumber));

  if (user) {
    if (!user.email_verified_at || !user.role_selected_at || user.role !== USER_ROLES.PLAYER) {
      await userRepository.markEmailVerified(client, user.user_id);
      await userRepository.selectRole(client, user.user_id, {
        role: USER_ROLES.PLAYER,
        status: USER_STATUSES.ACTIVE,
      });
    }
    return { userId: user.user_id, created: false, email: user.email, phoneNumber };
  }

  const passwordHash = await hashPassword(password);
  user = await userRepository.createUser(client, {
    email,
    passwordHash,
    fullName,
    phoneNumber,
    gender: 'male',
    role: USER_ROLES.PLAYER,
    status: USER_STATUSES.ACTIVE,
  });
  await userRepository.markEmailVerified(client, user.user_id);
  await userRepository.selectRole(client, user.user_id, {
    role: USER_ROLES.PLAYER,
    status: USER_STATUSES.ACTIVE,
  });
  await userSportSkillRepository.upsertSkill(client, {
    userId: user.user_id,
    sport: 'FOOTBALL',
    skillLevel: 'REC_BASIC',
  });

  return { userId: user.user_id, created: true, email, phoneNumber };
}

async function syncFootballDrafts(drafts, { dryRun, password }) {
  const { drafts: dedupedDrafts, preSkipped } = dedupeDraftsByVenueTime(drafts);
  const client = await pool.connect();
  const report = {
    dryRun,
    syncedAt: new Date().toISOString(),
    total: drafts.length,
    venueTimePreSkipped: preSkipped.length,
    created: 0,
    skipped: preSkipped.length,
    failed: 0,
    hostsCreated: 0,
    results: preSkipped.map(({ slug, conflictsWith }) => ({
      slug,
      status: 'skipped',
      reason: 'duplicate venue time in batch',
      message: `Same venue + overlapping time as ${conflictsWith}`,
    })),
  };
  const hostCache = new Map();

  try {
    for (const draft of dedupedDrafts) {
      const base = { slug: draft.slug, title: draft.spotCreateBody?.title };

      const existing = await findSeededMatch(client, draft.slug);
      if (existing) {
        report.skipped += 1;
        report.results.push({
          ...base,
          status: 'skipped',
          reason: 'already seeded',
          matchId: existing.match_id,
        });
        continue;
      }

      const prepared = prepareSpotCreateBody(draft.spotCreateBody);
      if (!prepared.ok) {
        report.skipped += 1;
        report.results.push({
          ...base,
          status: 'skipped',
          reason: prepared.reason,
          issues: prepared.issues ?? null,
        });
        continue;
      }

      const venueOverlap = await findVenueTimeOverlap(client, {
        venueName: prepared.body.venueName,
        startsAt: prepared.body.startsAt,
        endsAt: prepared.body.endsAt,
      });
      if (venueOverlap) {
        report.skipped += 1;
        report.results.push({
          ...base,
          status: 'skipped',
          reason: 'venue time overlap',
          matchId: venueOverlap.match_id,
        });
        continue;
      }

      let hostMeta = hostCache.get(draft.hostId);
      if (!hostMeta) {
        if (dryRun) {
          hostMeta = { userId: null, created: true, email: importEmailForHost(draft.hostId) };
        } else {
          hostMeta = await ensureFootballHost(client, draft, { password });
          if (hostMeta.created) report.hostsCreated += 1;
        }
        hostCache.set(draft.hostId, hostMeta);
      }

      if (dryRun) {
        report.created += 1;
        report.results.push({
          ...base,
          status: 'created',
          dryRun: true,
          hostEmail: hostMeta.email,
          venueName: prepared.body.venueName,
          startsAt: prepared.body.startsAt,
        });
        continue;
      }

      try {
        const match = await createMatch(hostMeta.userId, prepared.body);
        report.created += 1;
        report.results.push({
          ...base,
          status: 'created',
          matchId: match.matchId,
          hostEmail: hostMeta.email,
          venueName: prepared.body.venueName,
          startsAt: prepared.body.startsAt,
        });
      } catch (err) {
        report.failed += 1;
        const message =
          err instanceof AppError
            ? err.message
            : err?.message || String(err);
        report.results.push({
          ...base,
          status: 'failed',
          reason: message,
          code: err?.statusCode ?? null,
        });
      }
    }
  } finally {
    client.release();
  }

  return report;
}

async function main() {
  const args = parseArgs(process.argv);
  const drafts = buildFootballSeedDrafts(args.count);
  console.log(`Seeding ${drafts.length} FOOTBALL kèo (dryRun=${args.dryRun}) ...`);

  const report = await syncFootballDrafts(drafts, {
    dryRun: args.dryRun,
    password: args.password,
  });

  await mkdir(path.dirname(args.report), { recursive: true });
  await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(
    `Done: created=${report.created} skipped=${report.skipped} failed=${report.failed} hostsCreated=${report.hostsCreated}`,
  );
  console.log(`Report -> ${args.report}`);
  if (report.failed) {
    const fails = report.results.filter((r) => r.status === 'failed').slice(0, 5);
    console.log('Sample failures:', JSON.stringify(fails, null, 2));
  }
  console.log('\nLogin shadow hosts: football.*@import.spot.local / Password1!');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
