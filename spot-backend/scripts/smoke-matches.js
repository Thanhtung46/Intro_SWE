/**
 * Smoke: two PLAYERs → host kèo AUTO/APPROVAL → join / approve / mine / edit / kick / cancel.
 * Needs server up and OTP_DEBUG=true.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const password = 'Password1!';

function emailFor(tag) {
  return domain
    ? `${local}+m${tag}${stamp}@${domain}`
    : `m_${tag}_${stamp}@example.com`;
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

async function registerPlayer({ tag, fullName, gender, phoneNumber }) {
  const email = emailFor(tag);
  const registered = await request('POST', '/auth/register', {
    body: {
      fullName,
      email,
      phoneNumber,
      gender,
      password,
      confirmPassword: password,
    },
  });
  expectStatus(`register ${tag}`, registered, 201);
  const otp = registered.json.debugOtp;
  if (!otp) {
    fail(`register ${tag}`, 'Set OTP_DEBUG=true for smoke matches.');
  }

  const role = await request('POST', '/auth/role', {
    body: { email, role: 'PLAYER' },
  });
  expectStatus(`role ${tag}`, role, 200);

  const verified = await request('POST', '/auth/otp/verify', {
    body: { email, otp },
  });
  expectStatus(`verify ${tag}`, verified, 200);

  const login = await request('POST', '/auth/login', {
    body: { email, password },
  });
  expectStatus(`login ${tag}`, login, 200);
  const token = login.json.accessToken;
  const userId = login.json.user?.userId;
  if (!token || userId == null) {
    fail(`login ${tag}`, login.json);
  }

  const skills = await request('PATCH', '/auth/me', {
    token,
    body: { skills: { football: 'REC_BASIC' } },
  });
  expectStatus(`skills ${tag}`, skills, 200);

  return { email, token, userId };
}

function matchBody({ title, joinMode, courtName, startsAt, endsAt }) {
  return {
    sport: 'FOOTBALL',
    format: 'SEVEN_A_SIDE',
    title,
    venueName: `Smoke San ${stamp}`,
    venueAddress: `1 Smoke Street ${stamp}, Q7, TP.HCM`,
    startsAt,
    endsAt,
    maxPlayers: 14,
    skillMin: 'REC_BASIC',
    skillMax: 'SEMI_PRO',
    feeType: 'SPLIT_EVENLY',
    priceMin: 1400000,
    joinMode,
    courts: [{ name: courtName }],
  };
}

const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
const startsAt = start.toISOString();
const endsAt = end.toISOString();

const host = await registerPlayer({
  tag: 'h',
  fullName: 'Smoke Host',
  gender: 'male',
  phoneNumber: `08${String(stamp).slice(-8)}`,
});
const joiner = await registerPlayer({
  tag: 'j',
  fullName: 'Smoke Joiner',
  gender: 'female',
  phoneNumber: `09${String(stamp).slice(-8)}`,
});
log('Accounts', {
  host: { email: host.email, userId: host.userId },
  joiner: { email: joiner.email, userId: joiner.userId },
});

const createdAuto = await request('POST', '/matches', {
  token: host.token,
  body: matchBody({
    title: `Smoke AUTO ${stamp}`,
    joinMode: 'AUTO',
    courtName: 'A',
    startsAt,
    endsAt,
  }),
});
expectStatus('create AUTO', createdAuto, 201);
const autoId = createdAuto.json.match?.matchId;
if (createdAuto.json.match?.filledCount !== 1) {
  fail('create AUTO filledCount', createdAuto.json);
}

const createdApproval = await request('POST', '/matches', {
  token: host.token,
  body: matchBody({
    title: `Smoke APPROVAL ${stamp}`,
    joinMode: 'APPROVAL',
    courtName: 'B',
    startsAt,
    endsAt,
  }),
});
expectStatus('create APPROVAL', createdApproval, 201);
const approvalId = createdApproval.json.match?.matchId;

const createdReject = await request('POST', '/matches', {
  token: host.token,
  body: matchBody({
    title: `Smoke REJECT ${stamp}`,
    joinMode: 'APPROVAL',
    courtName: 'C',
    startsAt,
    endsAt,
  }),
});
expectStatus('create REJECT target', createdReject, 201);
const rejectId = createdReject.json.match?.matchId;
log('Created matches', { autoId, approvalId, rejectId });

const hostJoinOwn = await request('POST', `/matches/${autoId}/join`, {
  token: host.token,
  body: {},
});
log('Host join own (expect 400)', { status: hostJoinOwn.status });
expectStatus('host join own', hostJoinOwn, 400);

const joinAuto = await request('POST', `/matches/${autoId}/join`, {
  token: joiner.token,
  body: {},
});
expectStatus('join AUTO', joinAuto, 201);
if (joinAuto.json.request?.status !== 'ACCEPTED') {
  fail('join AUTO status', joinAuto.json);
}
if (joinAuto.json.match?.filledCount !== 2) {
  fail('join AUTO filledCount', joinAuto.json);
}

const joinAutoAgain = await request('POST', `/matches/${autoId}/join`, {
  token: joiner.token,
  body: {},
});
log('Join AUTO again (expect 409)', { status: joinAutoAgain.status });
expectStatus('join AUTO again', joinAutoAgain, 409);

const joinApproval = await request('POST', `/matches/${approvalId}/join`, {
  token: joiner.token,
  body: {
    message: 'Can I bring friends?',
    guests: [
      { name: 'Minh', skill: 'REC_BASIC', gender: 'male', phoneNumber: '0901111111' },
      { name: 'Lan', skill: 'LEARNING', gender: 'female', phoneNumber: '0902222222' },
    ],
  },
});
expectStatus('join APPROVAL', joinApproval, 201);
const approvalRequestId = joinApproval.json.request?.requestId;
if (joinApproval.json.request?.status !== 'PENDING') {
  fail('join APPROVAL status', joinApproval.json);
}
if (joinApproval.json.request?.heads !== 3) {
  fail('join APPROVAL heads', joinApproval.json);
}
if (!joinApproval.json.request?.phoneNumber) {
  fail('join APPROVAL missing requester phone', joinApproval.json);
}
if (joinApproval.json.request?.guests?.[0]?.phoneNumber !== '0901111111') {
  fail('join APPROVAL guest phone', joinApproval.json);
}
if (joinApproval.json.match?.filledCount !== 1) {
  fail('join APPROVAL filledCount still 1', joinApproval.json);
}

const joinReject = await request('POST', `/matches/${rejectId}/join`, {
  token: joiner.token,
  body: {},
});
expectStatus('join REJECT target', joinReject, 201);
const rejectRequestId = joinReject.json.request?.requestId;

const listed = await request('GET', `/matches/${approvalId}/requests`, {
  token: host.token,
});
expectStatus('list APPROVAL requests', listed, 200);
if (listed.json.total !== 1 || listed.json.requests?.[0]?.status !== 'PENDING') {
  fail('list APPROVAL requests', listed.json);
}

const accepted = await request(
  'POST',
  `/matches/${approvalId}/requests/${approvalRequestId}/accept`,
  { token: host.token },
);
expectStatus('accept APPROVAL', accepted, 200);
if (accepted.json.request?.status !== 'ACCEPTED') {
  fail('accept status', accepted.json);
}
if (accepted.json.match?.filledCount !== 4) {
  fail('accept filledCount', accepted.json);
}

const rejected = await request(
  'POST',
  `/matches/${rejectId}/requests/${rejectRequestId}/reject`,
  { token: host.token },
);
expectStatus('reject request', rejected, 200);
if (rejected.json.request?.status !== 'REJECTED') {
  fail('reject status', rejected.json);
}

const waitingAfterReject = await request('GET', `/matches/${rejectId}/requests`, {
  token: host.token,
});
expectStatus('list after reject', waitingAfterReject, 200);
if (waitingAfterReject.json.total !== 0) {
  fail('rejected still in waiting list', waitingAfterReject.json);
}

const mineActive = await request('GET', '/matches/mine?tab=active', {
  token: host.token,
});
expectStatus('GET mine active', mineActive, 200);
const activeIds = (mineActive.json.matches || []).map((row) => row.matchId);
if (![autoId, approvalId, rejectId].every((id) => activeIds.includes(id))) {
  fail('mine active missing matches', { activeIds, autoId, approvalId, rejectId });
}

const patched = await request('PATCH', `/matches/${autoId}`, {
  token: host.token,
  body: { title: `Smoke AUTO updated ${stamp}` },
});
expectStatus('PATCH title', patched, 200);
if (patched.json.match?.title !== `Smoke AUTO updated ${stamp}`) {
  fail('PATCH title value', patched.json);
}

const joinerPatch = await request('PATCH', `/matches/${autoId}`, {
  token: joiner.token,
  body: { title: 'should fail' },
});
log('Joiner PATCH (expect 403)', { status: joinerPatch.status });
expectStatus('joiner PATCH', joinerPatch, 403);

const kicked = await request(
  'POST',
  `/matches/${autoId}/participants/${joiner.userId}/kick`,
  { token: host.token },
);
expectStatus('kick AUTO', kicked, 200);
if (kicked.json.request?.status !== 'KICKED') {
  fail('kick status', kicked.json);
}
if (kicked.json.match?.filledCount !== 1) {
  fail('kick filledCount', kicked.json);
}

const rejoinKicked = await request('POST', `/matches/${autoId}/join`, {
  token: joiner.token,
  body: {},
});
log('Rejoin after kick (expect 403)', { status: rejoinKicked.status });
expectStatus('rejoin kicked', rejoinKicked, 403);

const autoDetail = await request('GET', `/matches/${autoId}`, {
  token: joiner.token,
});
expectStatus('detail AUTO after kick', autoDetail, 200);
if (autoDetail.json.yourRequest?.status !== 'KICKED') {
  fail('yourRequest after kick', autoDetail.json);
}
if (autoDetail.json.canJoin !== false) {
  fail('canJoin after kick', autoDetail.json);
}

const cancelled = await request('POST', `/matches/${approvalId}/cancel`, {
  token: host.token,
});
expectStatus('cancel APPROVAL', cancelled, 200);
if (cancelled.json.match?.status !== 'CANCELLED') {
  fail('cancel status', cancelled.json);
}

const cancelAgain = await request('POST', `/matches/${approvalId}/cancel`, {
  token: host.token,
});
log('Cancel again (expect 400)', { status: cancelAgain.status });
expectStatus('cancel again', cancelAgain, 400);

const mineCompleted = await request('GET', '/matches/mine?tab=completed', {
  token: host.token,
});
expectStatus('GET mine completed', mineCompleted, 200);
const completedIds = (mineCompleted.json.matches || []).map((row) => row.matchId);
if (!completedIds.includes(approvalId)) {
  fail('mine completed missing cancelled match', {
    completedIds,
    approvalId,
  });
}

const publicList = await request(
  'GET',
  `/matches?sport=FOOTBALL&location=${encodeURIComponent(`Smoke San ${stamp}`)}`,
  { token: joiner.token },
);
expectStatus('public list', publicList, 200);
const publicIds = (publicList.json.matches || []).map((row) => row.matchId);
if (publicIds.includes(approvalId)) {
  fail('cancelled match still in public list', publicList.json);
}
if (!publicIds.includes(autoId)) {
  fail('AUTO match missing from public list', publicList.json);
}

const hostProfile = await request('GET', `/users/${host.userId}`, {
  token: joiner.token,
});
expectStatus('GET /users/:id', hostProfile, 200);
const profileUser = hostProfile.json.user || {};
if (
  profileUser.userId != host.userId ||
  profileUser.email != null ||
  profileUser.phoneNumber != null ||
  profileUser.rating !== null ||
  profileUser.reviewCount !== 0 ||
  profileUser.matchCount == null ||
  profileUser.matchCount < 1 ||
  !profileUser.skills
) {
  fail('public host profile shape', hostProfile.json);
}

const badUserId = await request('GET', '/users/abc', { token: joiner.token });
expectStatus('GET /users/abc', badUserId, 400);

const missingUser = await request('GET', '/users/99999999', {
  token: joiner.token,
});
expectStatus('GET /users missing', missingUser, 404);

const hostedList = await request(
  'GET',
  `/matches?hostUserId=${host.userId}`,
  { token: joiner.token },
);
expectStatus('GET /matches?hostUserId=', hostedList, 200);
const hostedIds = (hostedList.json.matches || []).map((row) => row.matchId);
if (!hostedIds.includes(autoId)) {
  fail('hostUserId list missing AUTO match', hostedList.json);
}
if (hostedIds.includes(approvalId)) {
  fail('cancelled match still in hostUserId list', hostedList.json);
}
if ((hostedList.json.matches || []).some((row) => row.host?.userId != host.userId)) {
  fail('hostUserId list contains another host', hostedList.json);
}

console.log('\nSmoke matches OK');
