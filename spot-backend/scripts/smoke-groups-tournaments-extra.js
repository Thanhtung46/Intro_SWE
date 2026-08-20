/**
 * Extra smoke: endpoints not fully covered by smoke-groups / smoke-tournaments.
 * Reports any HTTP 500. Needs server + OTP_DEBUG=true + DB.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';
import pool from '../src/shared/database/pool.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const password = 'Password1!';
const results = [];

function emailFor(prefix, tag) {
  return domain
    ? `${local}+${prefix}${tag}${stamp}@${domain}`
    : `${prefix}${tag}${stamp}@example.com`;
}

function phoneFor(tag) {
  const salt = [...tag].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `09${String(stamp + salt).slice(-8)}`;
}

async function request(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  let res;
  let text;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    text = await res.text();
  } catch (err) {
    results.push({
      domain: path.startsWith('/groups')
        ? 'groups'
        : path.startsWith('/tournaments')
          ? 'tournaments'
          : 'auth',
      method,
      path,
      status: 'ERR',
      is500: false,
      msg: err?.message ?? String(err),
    });
    return { status: 0, json: {} };
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 120) };
  }
  const domainTag = path.startsWith('/groups')
    ? 'groups'
    : path.startsWith('/tournaments')
      ? 'tournaments'
      : 'auth';
  results.push({
    domain: domainTag,
    method,
    path,
    status: res.status,
    is500: res.status === 500,
    msg: json.message || json.error || '',
  });
  return { status: res.status, json };
}

async function register(prefix, tag) {
  const email = emailFor(prefix, tag);
  const registered = await request('POST', '/auth/register', {
    body: {
      fullName: tag,
      email,
      phoneNumber: phoneFor(tag),
      gender: 'male',
      password,
      confirmPassword: password,
    },
  });
  if (registered.status !== 201) {
    throw new Error(`register ${tag}: ${registered.status} ${registered.json.message}`);
  }
  const otp = registered.json.debugOtp;
  if (!otp) {
    throw new Error('Set OTP_DEBUG=true');
  }
  await request('POST', '/auth/role', { body: { email, role: 'PLAYER' } });
  await request('POST', '/auth/otp/verify', { body: { email, otp } });
  const login = await request('POST', '/auth/login', { body: { email, password } });
  await request('PATCH', '/auth/me', {
    token: login.json.accessToken,
    body: { skills: { football: 'REC_BASIC' } },
  });
  return { token: login.json.accessToken, userId: login.json.user.userId };
}

async function seedEligibility(userId, reviewerId) {
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
           $1, 'FOOTBALL', 'FIVE_A_SIDE', $2, 'V', 'A',
           '79', '778', 10.75, 106.68, $3, $4,
           10, 1, 'REC_BASIC', 'SEMI_PRO', 1, 5,
           'SPLIT_EVENLY', 50000, 'AUTO', 'COMPLETED'
         )`,
        [userId, `Ex${i}`, startsAt, endsAt],
      );
    }
    const { rows } = await client.query(
      `SELECT match_id FROM schema_matchmaking.matches
       WHERE host_user_id = $1 ORDER BY match_id DESC LIMIT 1`,
      [userId],
    );
    await client.query(
      `INSERT INTO schema_review.match_host_reviews (
         match_id, reviewer_user_id, host_user_id, rating
       ) VALUES ($1, $2, $3, 5)
       ON CONFLICT (match_id, reviewer_user_id) DO NOTHING`,
      [rows[0].match_id, reviewerId, userId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function footballRoster(size = 5) {
  return Array.from({ length: size }, (_, index) => ({
    name: `P${index + 1}`,
    jerseyNumber: index + 1,
  }));
}

// --- Groups extra ---
const gAdmin = await register('gx', 'adm');
const gJ1 = await register('gx', 'j1');
const gJ2 = await register('gx', 'j2');
const groupBody = {
  sport: 'FOOTBALL',
  name: `ExGrp ${stamp}`,
  title: 'tag',
  description: 'd',
  joinMode: 'APPROVAL',
  skillMin: 'REC_BASIC',
  skillMax: 'SEMI_PRO',
  venueName: `ExVenue ${stamp}`,
  venueAddress: `1 St ${stamp}`,
  province: '79',
  city: '778',
  courts: [{ name: 'A' }],
  recurringSlots: [
    { dayOfWeek: 7, startsAt: '17:30', durationMinutes: 60, courtName: 'A' },
  ],
};
const groupCreated = await request('POST', '/groups?sport=FOOTBALL', {
  token: gAdmin.token,
  body: groupBody,
});
const groupId = groupCreated.json.group?.groupId;
if (groupId) {
  await request('POST', `/groups/${groupId}/join`, { token: gJ1.token, body: {} });
  await request('GET', '/groups/my-join-requests', { token: gJ1.token });
  await request('DELETE', `/groups/${groupId}/join`, { token: gJ1.token });
  await request('POST', `/groups/${groupId}/join`, { token: gJ2.token, body: {} });
  const pending = await request('GET', `/groups/${groupId}/requests`, {
    token: gAdmin.token,
  });
  const requestId = pending.json.requests?.[0]?.requestId;
  if (requestId) {
    await request('POST', `/groups/${groupId}/requests/${requestId}/accept`, {
      token: gAdmin.token,
    });
  }
  await request('POST', `/groups/${groupId}/join`, { token: gJ1.token, body: {} });
  const pending2 = await request('GET', `/groups/${groupId}/requests`, {
    token: gAdmin.token,
  });
  const rejectId = pending2.json.requests?.[0]?.requestId;
  if (rejectId) {
    await request('POST', `/groups/${groupId}/requests/${rejectId}/reject`, {
      token: gAdmin.token,
    });
  }
  await request('POST', `/groups/${groupId}/favorite`, { token: gJ2.token });
  await request('DELETE', `/groups/${groupId}/favorite`, { token: gJ2.token });
}

// --- Tournaments extra ---
const organizer = await register('tx', 'org');
const captainA = await register('tx', 'ca');
const captainB = await register('tx', 'cb');
await seedEligibility(organizer.userId, captainA.userId);

const startsAt = new Date(Date.now() + 5 * 86_400_000);
const endsAt = new Date(startsAt.getTime() + 4 * 3_600_000);
const registrationDeadline = new Date(Date.now() + 3 * 86_400_000);
const tournamentBody = {
  sport: 'FOOTBALL',
  format: 'FIVE_A_SIDE',
  genderDivision: 'MEN',
  title: `ExT ${stamp}`,
  coverUrl: 'https://example.com/c.jpg',
  description: 'd',
  venueName: `ExTV ${stamp}`,
  venueAddress: `2 St ${stamp}`,
  province: '79',
  city: '778',
  latitude: 10.75,
  longitude: 106.68,
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
  registrationDeadline: registrationDeadline.toISOString(),
  maxTeams: 3,
  registrationFeeVnd: 100_000,
  prizePoolVnd: 1_000_000,
};

const tournamentCreated = await request('POST', '/tournaments', {
  token: organizer.token,
  body: tournamentBody,
});
const tournamentId = tournamentCreated.json.tournament?.tournamentId;
if (tournamentId) {
  const roster = footballRoster(5);
  await request('POST', `/tournaments/${tournamentId}/join`, {
    token: captainA.token,
    body: {
      teamName: `A ${stamp}`,
      teamLogoUrl: 'https://example.com/a.png',
      roster,
    },
  });
  await request('GET', '/tournaments/my-join-requests', { token: captainA.token });
  await request('DELETE', `/tournaments/${tournamentId}/join`, {
    token: captainA.token,
  });
  await request('POST', `/tournaments/${tournamentId}/join`, {
    token: captainA.token,
    body: {
      teamName: `A2 ${stamp}`,
      teamLogoUrl: 'https://example.com/a2.png',
      roster,
    },
  });
  await request('POST', `/tournaments/${tournamentId}/join`, {
    token: captainB.token,
    body: {
      teamName: `B ${stamp}`,
      teamLogoUrl: 'https://example.com/b.png',
      roster,
    },
  });
  const requestsList = await request('GET', `/tournaments/${tournamentId}/requests`, {
    token: organizer.token,
  });
  const pendingReq = requestsList.json.requests?.find((row) => row.status === 'PENDING');
  if (pendingReq) {
    await request(
      'POST',
      `/tournaments/${tournamentId}/requests/${pendingReq.requestId}/reject`,
      { token: organizer.token },
    );
  }
  const afterReject = await request('GET', `/tournaments/${tournamentId}/requests`, {
    token: organizer.token,
  });
  const acceptReq = afterReject.json.requests?.[0];
  if (acceptReq) {
    await request(
      'POST',
      `/tournaments/${tournamentId}/requests/${acceptReq.requestId}/accept`,
      { token: organizer.token },
    );
  }
  await request('POST', `/tournaments/${tournamentId}/favorite`, {
    token: captainA.token,
  });
  await request('DELETE', `/tournaments/${tournamentId}/favorite`, {
    token: captainA.token,
  });
  await request('GET', `/tournaments/${tournamentId}/matches`, {
    token: organizer.token,
  });
  await request('POST', `/tournaments/${tournamentId}/cancel`, {
    token: organizer.token,
  });
}

// --- Tournaments: kick + PATCH/DELETE match ---
const kickStarts = new Date(Date.now() + 6 * 86_400_000);
const kickEnds = new Date(kickStarts.getTime() + 4 * 3_600_000);
const kickDeadline = new Date(Date.now() + 4 * 86_400_000);
const kickBody = {
  ...tournamentBody,
  title: `Kick ${stamp}`,
  maxTeams: 2,
  startsAt: kickStarts.toISOString(),
  endsAt: kickEnds.toISOString(),
  registrationDeadline: kickDeadline.toISOString(),
};
const kickCreated = await request('POST', '/tournaments', {
  token: organizer.token,
  body: kickBody,
});
const kickTid = kickCreated.json.tournament?.tournamentId;
if (kickTid) {
  const roster = footballRoster(5);
  const joinKa = await request('POST', `/tournaments/${kickTid}/join`, {
    token: captainA.token,
    body: {
      teamName: `KA ${stamp}`,
      teamLogoUrl: 'https://example.com/ka.png',
      roster,
    },
  });
  const joinKb = await request('POST', `/tournaments/${kickTid}/join`, {
    token: captainB.token,
    body: {
      teamName: `KB ${stamp}`,
      teamLogoUrl: 'https://example.com/kb.png',
      roster,
    },
  });
  await request(
    'POST',
    `/tournaments/${kickTid}/requests/${joinKa.json.request.requestId}/accept`,
    { token: organizer.token },
  );
  await request(
    'POST',
    `/tournaments/${kickTid}/requests/${joinKb.json.request.requestId}/accept`,
    { token: organizer.token },
  );
  const kickPlayers = await request('GET', `/tournaments/${kickTid}/players`, {
    token: organizer.token,
  });
  const teamAId = kickPlayers.json.teams?.[0]?.teamId;
  const teamBId = kickPlayers.json.teams?.[1]?.teamId;
  if (teamAId && teamBId) {
    const matchCreated = await request('POST', `/tournaments/${kickTid}/matches`, {
      token: organizer.token,
      body: {
        round: 'GROUP_STAGE',
        teamAId,
        teamBId,
        scheduledAt: kickEnds.toISOString(),
      },
    });
    const matchId = matchCreated.json.match?.matchId;
    if (matchId) {
      await request('PATCH', `/tournaments/${kickTid}/matches/${matchId}`, {
        token: organizer.token,
        body: { round: 'SEMI_FINAL' },
      });
      await request('DELETE', `/tournaments/${kickTid}/matches/${matchId}`, {
        token: organizer.token,
      });
    }
    await request('POST', `/tournaments/${kickTid}/teams/${teamBId}/kick`, {
      token: organizer.token,
    });
  }
  await request('GET', `/tournaments/${kickTid}/standings?round=GROUP_STAGE`, {
    token: organizer.token,
  });
}

const internal500 = results.filter((row) => row.is500);
const groups = results.filter((row) => row.domain === 'groups');
const tournaments = results.filter((row) => row.domain === 'tournaments');

console.log(
  JSON.stringify(
    {
      total: results.length,
      internal500: internal500.length,
      failures500: internal500,
      groupsCalls: groups.length,
      tournamentsCalls: tournaments.length,
      results,
    },
    null,
    2,
  ),
);

await pool.end();
process.exit(internal500.length ? 1 : 0);
