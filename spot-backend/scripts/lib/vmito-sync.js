import { createHash } from 'crypto';
import { ZodError } from 'zod';
import { createMatchSchema } from '../../src/domains/matchmaking/dto/create-match.dto.js';
import { createMatch } from '../../src/domains/matchmaking/service/match.service.js';
import * as userRepository from '../../src/domains/auth/repository/user.repository.js';
import * as userSportSkillRepository from '../../src/domains/auth/repository/user-sport-skill.repository.js';
import { hashPassword } from '../../src/shared/utils/password.js';
import {
  isSkillForSport,
  rankForSkill,
} from '../../src/shared/constants/sports.js';
import { normalizeVnPhone as normalizeVnPhoneFromParser, SUPPORTED_PROVINCE_CODES, vmitoImportTag } from './vmito-parser.js';
import {
  filterItemsByVenueTime,
  findVenueSlotOverlap,
  rememberVenueSlot,
} from './vmito-venue-dedupe.js';
import {
  USER_ROLES,
  USER_STATUSES,
} from '../../src/shared/constants/auth.js';
import { AppError } from '../../src/shared/middleware/errorHandler.js';
import { FEE_TYPES } from '../../src/shared/constants/matchmaking.js';
import pool from '../../src/shared/database/pool.js';

const DEFAULT_PASSWORD = 'Password1!';

function isSupportedProvinceDraft(draft) {
  if (draft.supportedProvince === false) return false;
  if (draft.supportedProvince === true) return true;
  const province = draft.provinceCode ?? draft.spotCreateBody?.province;
  return SUPPORTED_PROVINCE_CODES.includes(province);
}

function sanitizeName(value) {
  return (
    String(value || '')
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'Vmito Host'
  );
}

export function normalizeVnPhone(value) {
  return normalizeVnPhoneFromParser(value);
}

export function syntheticPhoneForHost(hostId) {
  const digest = createHash('sha256').update(hostId).digest('hex');
  return `09${digest.replace(/\D/g, '').slice(0, 8)}`;
}

export function importEmailForHost(hostId) {
  const token = hostId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-24) || 'host';
  return `vmito.${token}@import.spot.local`;
}

function isHttpUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(String(value).trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function uniqueCourtNames(courts) {
  const seen = new Map();
  return courts.map((court, index) => {
    const base = String(court.name || `San ${index + 1}`).trim().slice(0, 72) || `San ${index + 1}`;
    const count = seen.get(base.toLowerCase()) ?? 0;
    seen.set(base.toLowerCase(), count + 1);
    const name = count === 0 ? base : `${base} (${count + 1})`;
    return { name: name.slice(0, 80) };
  });
}

export function bumpToFutureRange(startsAt, endsAt) {
  const skewMs = 60 * 1000;
  let start = new Date(startsAt);
  let end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, reason: 'invalid datetime' };
  }
  const durationMs = Math.max(end.getTime() - start.getTime(), 60 * 60 * 1000);
  let bumpedWeeks = 0;
  while (start.getTime() < Date.now() - skewMs) {
    start = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    bumpedWeeks += 1;
    if (bumpedWeeks > 52) {
      return { ok: false, reason: 'startsAt too far in the past' };
    }
  }
  end = new Date(start.getTime() + durationMs);
  return {
    ok: true,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    bumpedWeeks,
  };
}

export function prepareSpotCreateBody(rawBody) {
  const skipped = [];
  const body = { ...rawBody, courts: [...(rawBody.courts || [])] };

  const range = bumpToFutureRange(body.startsAt, body.endsAt);
  if (!range.ok) {
    return { ok: false, reason: range.reason, skipped };
  }
  body.startsAt = range.startsAt;
  body.endsAt = range.endsAt;
  if (range.bumpedWeeks > 0) {
    skipped.push(`startsAt bumped +${range.bumpedWeeks} week(s)`);
  }

  if (body.coverUrl && !isHttpUrl(body.coverUrl)) {
    skipped.push('coverUrl');
    delete body.coverUrl;
  }

  body.courts = uniqueCourtNames(body.courts);
  if (!body.courts.length) {
    body.courts = [{ name: 'San 1' }];
    skipped.push('courts defaulted');
  }

  if (!body.allLevels && (!body.skillMin || !body.skillMax)) {
    body.allLevels = true;
    delete body.skillMin;
    delete body.skillMax;
    skipped.push('skills -> allLevels');
  }

  if (body.feeType === FEE_TYPES.SPLIT_EVENLY) {
    delete body.priceMax;
    if (body.priceMin == null || body.priceMin < 1) {
      body.priceMin = 100000;
      skipped.push('priceMin defaulted');
    }
  }

  if (body.feeType === FEE_TYPES.GENDER_RANGE) {
    if (body.priceMin == null) body.priceMin = 50000;
    if (body.priceMax == null) body.priceMax = body.priceMin;
    if (body.priceMax < body.priceMin) {
      body.priceMax = body.priceMin;
      skipped.push('priceMax adjusted');
    }
  }

  const parsed = createMatchSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'validation failed',
      issues: parsed.error.flatten(),
      skipped,
    };
  }

  return { ok: true, body: parsed.data, skipped };
}

/** Highest skill ceiling the host set on a kèo (`skillMax`; skip `allLevels`). */
export function hostSkillFromCreateBody(spotCreateBody) {
  if (!spotCreateBody?.sport || spotCreateBody.allLevels) {
    return null;
  }
  const sport = spotCreateBody.sport;
  const code = spotCreateBody.skillMax ?? spotCreateBody.skillMin;
  if (!code || !isSkillForSport(sport, code)) {
    return null;
  }
  const rank = rankForSkill(sport, code);
  if (rank == null) {
    return null;
  }
  return { sport, skillCode: code, rank };
}

/** Per hostId → per sport → highest skill across all their kèo drafts. */
export function buildHostSkillMap(drafts) {
  const map = new Map();
  for (const draft of drafts) {
    const hint = hostSkillFromCreateBody(draft.spotCreateBody);
    if (!hint || !draft.hostId) {
      continue;
    }
    if (!map.has(draft.hostId)) {
      map.set(draft.hostId, new Map());
    }
    const bySport = map.get(draft.hostId);
    const prev = bySport.get(hint.sport);
    if (!prev || hint.rank > prev.rank) {
      bySport.set(hint.sport, hint);
    }
  }
  return map;
}

async function resolveHostUserId(client, hostId, hostCache) {
  const cached = hostCache.get(hostId);
  if (cached?.userId) {
    return cached.userId;
  }
  const byEmail = await userRepository.findByEmail(client, importEmailForHost(hostId));
  return byEmail?.user_id ?? null;
}

async function applyHostSkills(client, { hostSkillMap, hostCache, dryRun }) {
  const applied = [];
  for (const [hostId, bySport] of hostSkillMap) {
    for (const [, hint] of bySport) {
      if (dryRun) {
        applied.push({
          hostId,
          sport: hint.sport,
          skillCode: hint.skillCode,
          dryRun: true,
        });
        continue;
      }
      const userId = await resolveHostUserId(client, hostId, hostCache);
      if (!userId) {
        continue;
      }
      await userSportSkillRepository.upsertSkill(client, {
        userId,
        sport: hint.sport,
        skillLevel: hint.skillCode,
      });
      applied.push({
        hostId,
        userId,
        sport: hint.sport,
        skillCode: hint.skillCode,
      });
    }
  }
  return applied;
}

export async function findSyncedMatch(client, slug) {
  const { rows } = await client.query(
    `SELECT match_id, host_user_id, title
     FROM schema_matchmaking.matches
     WHERE notes ILIKE $1 OR notes ILIKE $2
     LIMIT 1`,
    [`%${vmitoImportTag(slug)}%`, `%vmito.com/vi/sessions/${slug}%`],
  );
  return rows[0] || null;
}

/** Same venue name + overlapping time (any host) — never import a second kèo. */
export async function findVenueTimeOverlap(client, { venueName, startsAt, endsAt }) {
  if (!venueName?.trim()) {
    return null;
  }
  const { rows } = await client.query(
    `SELECT match_id, host_user_id, title, venue_name, starts_at, ends_at
     FROM schema_matchmaking.matches
     WHERE status = ANY($1::text[])
       AND schema_matchmaking.fold_search_text(venue_name)
           = schema_matchmaking.fold_search_text($2::text)
       AND starts_at < $4::timestamptz
       AND ends_at > $3::timestamptz
     ORDER BY starts_at ASC
     LIMIT 1`,
    [['OPEN', 'FULL'], venueName, startsAt, endsAt],
  );
  return rows[0] || null;
}

function findBatchVenueTimeOverlap(batchSlots, { venueName, startsAt, endsAt }) {
  return findVenueSlotOverlap(batchSlots, { venueName, startsAt, endsAt });
}

function rememberBatchVenueSlot(batchSlots, { venueName, startsAt, endsAt, slug }) {
  rememberVenueSlot(batchSlots, { venueName, startsAt, endsAt, slug });
}

/** Drop later drafts that share venue name + overlapping time (first wins). */
export function dedupeDraftsByVenueTime(drafts) {
  const sorted = [...drafts].sort((a, b) => {
    const ae = a.syncEligible === true ? 0 : 1;
    const be = b.syncEligible === true ? 0 : 1;
    if (ae !== be) return ae - be;
    return String(a.slug ?? '').localeCompare(String(b.slug ?? ''));
  });

  const { kept, skipped } = filterItemsByVenueTime(sorted, (draft) => {
    if (!isSupportedProvinceDraft(draft)) {
      return null;
    }
    const prepared = prepareSpotCreateBody(draft.spotCreateBody);
    if (!prepared.ok) {
      return null;
    }
    return {
      venueName: prepared.body.venueName,
      startsAt: prepared.body.startsAt,
      endsAt: prepared.body.endsAt,
    };
  }, { getSlug: (draft) => draft.slug });

  return { drafts: kept, preSkipped: skipped };
}

export async function ensureVmitoHost(
  client,
  { hostId, hostName, hostPhone },
  { password = DEFAULT_PASSWORD } = {},
) {
  const phoneNumber = normalizeVnPhone(hostPhone) || syntheticPhoneForHost(hostId);
  const email = importEmailForHost(hostId);
  const fullName = sanitizeName(hostName);

  let user =
    (await userRepository.findByPhone(client, phoneNumber)) ||
    (await userRepository.findByEmail(client, email));

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

  return { userId: user.user_id, created: true, email, phoneNumber };
}

export async function syncVmitoDrafts(drafts, { dryRun = false, password = DEFAULT_PASSWORD } = {}) {
  const { drafts: dedupedDrafts, preSkipped } = dedupeDraftsByVenueTime(drafts);
  const client = await pool.connect();
  const hostSkillMap = buildHostSkillMap(dedupedDrafts);
  const report = {
    dryRun,
    syncedAt: new Date().toISOString(),
    total: drafts.length,
    venueTimePreSkipped: preSkipped.length,
    created: 0,
    skipped: preSkipped.length,
    failed: 0,
    hostsCreated: 0,
    hostSkillsApplied: [],
    results: preSkipped.map(({ slug, conflictsWith }) => ({
      slug,
      status: 'skipped',
      reason: 'duplicate venue time in batch',
      message: `Same venue name + overlapping time as slug ${conflictsWith} (pre-filter)`,
    })),
  };

  const hostCache = new Map();
  const batchVenueSlots = [];

  try {
    for (const draft of dedupedDrafts) {
      const base = {
        slug: draft.slug,
        vmitoId: draft.vmitoId,
        title: draft.spotCreateBody?.title,
      };

      const existing = await findSyncedMatch(client, draft.slug);
      if (existing) {
        report.skipped += 1;
        report.results.push({
          ...base,
          status: 'skipped',
          reason: 'already synced',
          matchId: existing.match_id,
        });
        continue;
      }

      if (!isSupportedProvinceDraft(draft)) {
        report.skipped += 1;
        report.results.push({
          ...base,
          status: 'skipped',
          reason: 'unsupported province (HCM/Hanoi only)',
        });
        continue;
      }

      if (draft.syncEligible === false) {
        report.skipped += 1;
        report.results.push({
          ...base,
          status: 'skipped',
          reason: 'not sync eligible',
          issues: draft.syncEligibleReasons ?? [],
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
          skippedFields: prepared.skipped ?? [],
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
          message: 'Same venue name and overlapping time already in DB',
          details: {
            matchId: venueOverlap.match_id,
            title: venueOverlap.title,
            venueName: venueOverlap.venue_name,
            startsAt: venueOverlap.starts_at,
            endsAt: venueOverlap.ends_at,
          },
          skippedFields: prepared.skipped,
        });
        continue;
      }

      const batchOverlap = findBatchVenueTimeOverlap(batchVenueSlots, {
        venueName: prepared.body.venueName,
        startsAt: prepared.body.startsAt,
        endsAt: prepared.body.endsAt,
      });
      if (batchOverlap) {
        report.skipped += 1;
        report.results.push({
          ...base,
          status: 'skipped',
          reason: 'duplicate venue time in batch',
          message: `Same venue + time as slug ${batchOverlap.slug} in this sync run`,
          skippedFields: prepared.skipped,
        });
        continue;
      }

      let hostMeta = hostCache.get(draft.hostId);
      if (!hostMeta) {
        if (dryRun) {
          hostMeta = {
            userId: null,
            created: false,
            email: importEmailForHost(draft.hostId),
            phoneNumber:
              normalizeVnPhone(draft.hostPhone) || syntheticPhoneForHost(draft.hostId),
          };
        } else {
          await client.query('BEGIN');
          try {
            hostMeta = await ensureVmitoHost(
              client,
              {
                hostId: draft.hostId,
                hostName: draft.hostName,
                hostPhone: draft.hostPhone,
              },
              { password },
            );
            await client.query('COMMIT');
            if (hostMeta.created) report.hostsCreated += 1;
          } catch (err) {
            await client.query('ROLLBACK');
            report.failed += 1;
            report.results.push({
              ...base,
              status: 'failed',
              reason: 'host create failed',
              message: err.message,
            });
            continue;
          }
        }
        hostCache.set(draft.hostId, hostMeta);
      }

      if (dryRun) {
        report.created += 1;
        rememberBatchVenueSlot(batchVenueSlots, {
          venueName: prepared.body.venueName,
          startsAt: prepared.body.startsAt,
          endsAt: prepared.body.endsAt,
          slug: draft.slug,
        });
        report.results.push({
          ...base,
          status: 'dry-run',
          hostUserId: hostMeta.userId,
          hostEmail: hostMeta.email,
          hostPhone: hostMeta.phoneNumber,
          skippedFields: prepared.skipped,
          startsAt: prepared.body.startsAt,
          endsAt: prepared.body.endsAt,
        });
        continue;
      }

      try {
        const result = await createMatch(hostMeta.userId, prepared.body);
        rememberBatchVenueSlot(batchVenueSlots, {
          venueName: prepared.body.venueName,
          startsAt: prepared.body.startsAt,
          endsAt: prepared.body.endsAt,
          slug: draft.slug,
        });
        report.created += 1;
        report.results.push({
          ...base,
          status: 'created',
          matchId: result.match?.matchId ?? null,
          hostUserId: hostMeta.userId,
          hostEmail: hostMeta.email,
          skippedFields: prepared.skipped,
        });
      } catch (err) {
        if (err instanceof AppError && err.statusCode === 409) {
          report.skipped += 1;
          report.results.push({
            ...base,
            status: 'skipped',
            reason: 'pitch overlap',
            message: err.message,
            details: err.details ?? null,
            skippedFields: prepared.skipped,
          });
          continue;
        }
        report.failed += 1;
        report.results.push({
          ...base,
          status: 'failed',
          reason: err instanceof ZodError ? 'validation' : 'createMatch',
          message: err.message,
          skippedFields: prepared.skipped,
        });
      }
    }

    report.hostSkillsApplied = await applyHostSkills(client, {
      hostSkillMap,
      hostCache,
      dryRun,
    });
  } finally {
    client.release();
  }

  return report;
}
