/**
 * Smoke: Tournaments T0–T4 — eligibility seed / create / join / approve / matches /
 * standings / PATCH winners+ranks / complete / ACTIVE lock / notifications.
 * Needs server up, OTP_DEBUG=true, and DB reachable (seeds 80 completed kèo for organizer).
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';
import pool from '../src/shared/database/pool.js';
import { processTournamentLifecycle } from '../src/domains/tournaments/service/tournament-lifecycle.service.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const password = 'Password1!';

function emailFor(tag) {
  return domain
    ? `${local}+t${tag}${stamp}@${domain}`
    : `t_${tag}_${stamp}@example.com`;
}

async function request(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function log(step, data) {
  console.log(`\n=== ${step} ===`);
  console.log(JSON.stringify(data, null, 2));
}

function fail(step, extra) {
  console.error(`FAIL ${step}`);
  if (extra !== undefined) {
    console.error(JSON.stringify(extra, null, 2));
  }
  process.exit(1);
}

function expectStatus(step, result, status) {
  if (result.status !== status) {
    fail(step, { expected: status, ...result });
  }
}

async function expectInboxType(token, type, step) {
  const inbox = await request('GET', '/notifications?limit=20', { token });
  expectStatus(`inbox ${step}`, inbox, 200);
  const found = (inbox.json.items || []).some((item) => item.type === type);
  if (!found) {
    fail(`missing notification ${type}`, inbox.json);
  }
}

function phoneFor(tag) {
  const tagSalt = [...tag].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `09${String(stamp + tagSalt).slice(-8)}`;
}

async function registerPlayer({ tag, fullName }) {
  const email = emailFor(tag);
  let registered;
  try {
    registered = await request('POST', '/auth/register', {
      body: {
        fullName,
        email,
        phoneNumber: phoneFor(tag),
        gender: 'male',
        password,
        confirmPassword: password,
      },
    });
  } catch (err) {
    fail(`register ${tag}`, {
      hint: 'Is the backend running? Start npm run dev (or docker compose up backend) and wait for the startup log.',
      baseUrl,
      error: err?.message ?? String(err),
      cause: err?.cause?.message ?? err?.cause,
    });
  }
  expectStatus(`register ${tag}`, registered, 201);
  const otp = registered.json.debugOtp;
  if (!otp) {
    fail(`register ${tag}`, 'Set OTP_DEBUG=true for smoke tournaments.');
  }

  await request('POST', '/auth/role', { body: { email, role: 'PLAYER' } });
  await request('POST', '/auth/otp/verify', { body: { email, otp } });

  const login = await request('POST', '/auth/login', {
    body: { email, password },
  });
  expectStatus(`login ${tag}`, login, 200);
  const token = login.json.accessToken;
  const userId = login.json.user?.userId;
  if (!token || userId == null) {
    fail(`login ${tag}`, login.json);
  }

  return { email, token, userId, fullName };
}

async function seedOrganizerEligibility(organizerUserId, reviewerUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const startsAt = new Date(Date.now() - 86_400_000);
    const endsAt = new Date(Date.now() - 3_600_000);

    for (let i = 0; i < 80; i += 1) {
      await client.query(
        `INSERT INTO schema_matchmaking.matches (
           host_user_id, sport, format, title, venue_name, venue_address,
           province, city, venue_lat, venue_lng, starts_at, ends_at,
           max_players, filled_count, skill_min, skill_max, skill_min_rank, skill_max_rank,
           fee_type, price_min, join_mode, status
         ) VALUES (
           $1, 'FOOTBALL', 'FIVE_A_SIDE', $2, 'Smoke Eligibility Venue', '1 Smoke St',
           '79', '778', 10.75, 106.68, $3, $4,
           10, 1, 'REC_BASIC', 'SEMI_PRO', 1, 5,
           'SPLIT_EVENLY', 50000, 'AUTO', 'COMPLETED'
         )`,
        [organizerUserId, `Smoke eligibility ${i}`, startsAt, endsAt],
      );
    }

    const { rows } = await client.query(
      `SELECT match_id FROM schema_matchmaking.matches
       WHERE host_user_id = $1 ORDER BY match_id DESC LIMIT 1`,
      [organizerUserId],
    );
    await client.query(
      `INSERT INTO schema_review.match_host_reviews (
         match_id, reviewer_user_id, host_user_id, rating
       ) VALUES ($1, $2, $3, 5)
       ON CONFLICT (match_id, reviewer_user_id) DO NOTHING`,
      [rows[0].match_id, reviewerUserId, organizerUserId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function tournamentBody() {
  const startsAt = new Date(Date.now() + 3 * 86_400_000);
  const endsAt = new Date(startsAt.getTime() + 4 * 3_600_000);
  const registrationDeadline = new Date(Date.now() + 2 * 86_400_000);
  return {
    sport: 'FOOTBALL',
    format: 'FIVE_A_SIDE',
    genderDivision: 'MEN',
    title: `Smoke Tournament ${stamp}`,
    coverUrl: 'https://example.com/tournament-cover.jpg',
    description: 'Smoke tournament — rules live in About only.',
    venueName: `Smoke Tournament Venue ${stamp}`,
    venueAddress: `1 Smoke Tournament St ${stamp}, Q7, TP.HCM`,
    province: '79',
    city: '778',
    latitude: 10.75,
    longitude: 106.68,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    registrationDeadline: registrationDeadline.toISOString(),
    maxTeams: 2,
    registrationFeeVnd: 100_000,
    prizePoolVnd: 5_000_000,
  };
}

function footballRoster(size = 5) {
  return Array.from({ length: size }, (_, index) => ({
    name: `Player ${index + 1}`,
    jerseyNumber: index + 1,
  }));
}

const organizer = await registerPlayer({
  tag: 'org',
  fullName: 'Smoke Tournament Organizer',
});
const captainA = await registerPlayer({
  tag: 'ca',
  fullName: 'Smoke Captain Alpha',
});
const captainB = await registerPlayer({
  tag: 'cb',
  fullName: 'Smoke Captain Beta',
});

log('Accounts', {
  organizer: organizer.userId,
  captainA: captainA.userId,
  captainB: captainB.userId,
});

await seedOrganizerEligibility(organizer.userId, captainA.userId);

const created = await request('POST', '/tournaments?sport=FOOTBALL', {
  token: organizer.token,
  body: tournamentBody(),
});
expectStatus('create tournament', created, 201);
const tournamentId = created.json.tournament?.tournamentId;
if (!tournamentId) {
  fail('create tournament id', created.json);
}
if (created.json.tournament?.hostedByLabel !== 'SPOT') {
  fail('hostedByLabel', created.json);
}

const browse = await request(
  'GET',
  `/tournaments?sport=FOOTBALL&location=${encodeURIComponent(`Smoke Tournament ${stamp}`)}`,
  { token: captainA.token },
);
expectStatus('browse tournaments', browse, 200);

const favorited = await request('POST', `/tournaments/${tournamentId}/favorite`, {
  token: captainA.token,
});
expectStatus('favorite tournament', favorited, 200);

const joinA = await request('POST', `/tournaments/${tournamentId}/join`, {
  token: captainA.token,
  body: {
    teamName: `Alpha FC ${stamp}`,
    teamLogoUrl: 'https://example.com/alpha.png',
    roster: footballRoster(5),
  },
});
expectStatus('captain A join', joinA, 201);
const requestAId = joinA.json.request?.requestId;
await expectInboxType(organizer.token, 'TOURNAMENT_JOIN_REQUEST', 'join A');

const joinB = await request('POST', `/tournaments/${tournamentId}/join`, {
  token: captainB.token,
  body: {
    teamName: `Beta FC ${stamp}`,
    teamLogoUrl: 'https://example.com/beta.png',
    roster: footballRoster(5),
  },
});
expectStatus('captain B join', joinB, 201);
const requestBId = joinB.json.request?.requestId;

const acceptA = await request(
  'POST',
  `/tournaments/${tournamentId}/requests/${requestAId}/accept`,
  { token: organizer.token },
);
expectStatus('accept team A', acceptA, 200);
await expectInboxType(captainA.token, 'TOURNAMENT_JOIN_APPROVED', 'accept A');

const acceptB = await request(
  'POST',
  `/tournaments/${tournamentId}/requests/${requestBId}/accept`,
  { token: organizer.token },
);
expectStatus('accept team B', acceptB, 200);

const detailFull = await request('GET', `/tournaments/${tournamentId}`, {
  token: organizer.token,
});
expectStatus('detail after full', detailFull, 200);
if (detailFull.json.tournament?.status !== 'FULL') {
  fail('expected FULL after second accept', detailFull.json);
}

const playersBefore = await request('GET', `/tournaments/${tournamentId}/players`, {
  token: organizer.token,
});
expectStatus('players list', playersBefore, 200);
if ((playersBefore.json.teams || []).length !== 2) {
  fail('players team count', playersBefore.json);
}
const teamAId = playersBefore.json.teams[0].teamId;
const teamBId = playersBefore.json.teams[1].teamId;
const rosterPlayerId = playersBefore.json.teams[0].roster[0].rosterPlayerId;

const client = await pool.connect();
try {
  await client.query(
    `UPDATE schema_tournaments.tournaments
     SET starts_at = NOW() - INTERVAL '1 hour',
         registration_deadline = NOW() - INTERVAL '2 hours'
     WHERE tournament_id = $1`,
    [tournamentId],
  );
} finally {
  client.release();
}

const lifecycle = await processTournamentLifecycle();
log('lifecycle tick', lifecycle);

const detailActive = await request('GET', `/tournaments/${tournamentId}`, {
  token: organizer.token,
});
expectStatus('detail after start', detailActive, 200);
if (detailActive.json.tournament?.status !== 'ACTIVE') {
  fail('expected ACTIVE', detailActive.json);
}

const scheduledAt = detailActive.json.tournament.endsAt;
const matchCreated = await request('POST', `/tournaments/${tournamentId}/matches`, {
  token: organizer.token,
  body: {
    round: 'GROUP_STAGE',
    teamAId,
    teamBId,
    scheduledAt,
  },
});
expectStatus('create match', matchCreated, 201);
const matchId = matchCreated.json.match?.matchId;

const matchResult = await request(
  'PATCH',
  `/tournaments/${tournamentId}/matches/${matchId}/result`,
  {
    token: organizer.token,
    body: { teamAGoals: 2, teamBGoals: 1 },
  },
);
expectStatus('match result', matchResult, 200);

const standings = await request('GET', `/tournaments/${tournamentId}/standings`, {
  token: organizer.token,
});
expectStatus('standings', standings, 200);
if (!standings.json.standings?.length) {
  fail('standings empty', standings.json);
}

const patched = await request('PATCH', `/tournaments/${tournamentId}`, {
  token: organizer.token,
  body: {
    description: 'Updated smoke description.',
    winners: [{ place: 1, teamId: teamAId }],
    playerRanks: [{ rosterPlayerId, rank: 1 }],
  },
});
expectStatus('PATCH tournament', patched, 200);
if (!patched.json.tournament?.winners?.length) {
  fail('winners missing on PATCH', patched.json);
}

const lockedPatch = await request('PATCH', `/tournaments/${tournamentId}`, {
  token: organizer.token,
  body: { venueName: 'New venue after ACTIVE' },
});
if (lockedPatch.status !== 400) {
  fail('expected ACTIVE lock 400', lockedPatch);
}

const completed = await request('POST', `/tournaments/${tournamentId}/complete`, {
  token: organizer.token,
  body: {},
});
expectStatus('complete tournament', completed, 200);
if (completed.json.tournament?.status !== 'COMPLETED') {
  fail('expected COMPLETED', completed.json);
}

const playersRanked = await request('GET', `/tournaments/${tournamentId}/players`, {
  token: organizer.token,
});
expectStatus('players ranked', playersRanked, 200);
const topRank = playersRanked.json.teams?.[0]?.roster?.[0]?.rank;
if (topRank !== 1) {
  fail('expected rank sort', playersRanked.json);
}

const mineHosted = await request(
  'GET',
  '/tournaments/mine?tab=hosted&section=tournaments',
  { token: organizer.token },
);
expectStatus('mine hosted', mineHosted, 200);

const mineJoined = await request(
  'GET',
  '/tournaments/mine?tab=joined&section=tournaments',
  { token: captainA.token },
);
expectStatus('mine joined', mineJoined, 200);

log('OK', {
  tournamentId,
  lifecycle,
  standingsCount: standings.json.standings?.length,
});

await pool.end();
