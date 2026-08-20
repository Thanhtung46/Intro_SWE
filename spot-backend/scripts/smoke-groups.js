/**
 * Smoke: Groups G0–G3 — create / join APPROVAL+AUTO / PATCH flush / members / schedule / gallery / kick / transfer / delete.
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
    ? `${local}+g${tag}${stamp}@${domain}`
    : `g_${tag}_${stamp}@example.com`;
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
  const inbox = await request('GET', '/notifications?limit=10', { token });
  expectStatus(`inbox ${step}`, inbox, 200);
  const found = (inbox.json.items || []).some((item) => item.type === type);
  if (!found) {
    fail(`missing notification ${type}`, inbox.json);
  }
}

async function registerPlayer({ tag, fullName, skill = 'REC_BASIC' }) {
  const email = emailFor(tag);
  const registered = await request('POST', '/auth/register', {
    body: {
      fullName,
      email,
      phoneNumber: `08${String(stamp + tag.length).slice(-8)}`,
      gender: 'male',
      password,
      confirmPassword: password,
    },
  });
  expectStatus(`register ${tag}`, registered, 201);
  const otp = registered.json.debugOtp;
  if (!otp) {
    fail(`register ${tag}`, 'Set OTP_DEBUG=true for smoke groups.');
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

  const skills = await request('PATCH', '/auth/me', {
    token,
    body: { skills: { football: skill } },
  });
  expectStatus(`skills ${tag}`, skills, 200);

  return { email, token, userId, fullName };
}

function groupBody({ name, joinMode }) {
  return {
    sport: 'FOOTBALL',
    name,
    title: `Tagline ${stamp}`,
    description: 'Smoke group',
    joinMode,
    skillMin: 'REC_BASIC',
    skillMax: 'SEMI_PRO',
    venueName: `Smoke Group Venue ${stamp}`,
    venueAddress: `2 Smoke Group St ${stamp}, Q7, TP.HCM`,
    province: '79',
    city: '778',
    zaloUrl: 'https://zalo.me/smoke-group',
    courts: [{ name: 'Court A' }, { name: 'Court B' }],
    recurringSlots: [
      {
        dayOfWeek: 7,
        startsAt: '17:30',
        durationMinutes: 60,
        courtName: 'Court A',
      },
    ],
  };
}

const admin = await registerPlayer({
  tag: 'a',
  fullName: 'Smoke Group Admin',
});
const joiner1 = await registerPlayer({
  tag: 'j1',
  fullName: 'Smoke Joiner One',
});
const joiner2 = await registerPlayer({
  tag: 'j2',
  fullName: 'Smoke Joiner Two',
});
const lowSkill = await registerPlayer({
  tag: 'ls',
  fullName: 'Smoke Low Skill',
  skill: 'LEARNING',
});

log('Accounts', {
  admin: admin.userId,
  joiner1: joiner1.userId,
  joiner2: joiner2.userId,
});

const createdApproval = await request('POST', '/groups?sport=FOOTBALL', {
  token: admin.token,
  body: groupBody({
    name: `Smoke APPROVAL ${stamp}`,
    joinMode: 'APPROVAL',
  }),
});
expectStatus('create APPROVAL group', createdApproval, 201);
const approvalGroupId = createdApproval.json.group?.groupId;
if (createdApproval.json.group?.myRole !== 'ADMIN') {
  fail('create myRole', createdApproval.json);
}
if (createdApproval.json.group?.memberCount !== 1) {
  fail('create memberCount', createdApproval.json);
}

const createdAuto = await request('POST', '/groups', {
  token: admin.token,
  body: groupBody({
    name: `Smoke AUTO ${stamp}`,
    joinMode: 'AUTO',
  }),
});
expectStatus('create AUTO group', createdAuto, 201);
const autoGroupId = createdAuto.json.group?.groupId;

const browse = await request(
  'GET',
  `/groups?sport=FOOTBALL&location=${encodeURIComponent(`Smoke APPROVAL ${stamp}`)}`,
  { token: joiner1.token },
);
expectStatus('browse groups', browse, 200);
if (!Array.isArray(browse.json.suggestions)) {
  fail('browse suggestions', browse.json);
}

const detail = await request('GET', `/groups/${approvalGroupId}`, {
  token: joiner1.token,
});
expectStatus('group detail', detail, 200);
if (!detail.json.group?.recurringSlots?.length) {
  fail('detail recurringSlots', detail.json);
}

const joinAuto = await request('POST', `/groups/${autoGroupId}/join`, {
  token: joiner1.token,
  body: { message: 'AUTO please' },
});
expectStatus('join AUTO group', joinAuto, 201);
if (joinAuto.json.request?.status !== 'ACCEPTED') {
  fail('join AUTO status', joinAuto.json);
}
if (joinAuto.json.group?.memberCount !== 2) {
  fail('join AUTO memberCount', joinAuto.json);
}
await expectInboxType(joiner1.token, 'GROUP_APPROVED', 'auto join approved');

const joinApproval1 = await request('POST', `/groups/${approvalGroupId}/join`, {
  token: joiner1.token,
  body: {},
});
expectStatus('join APPROVAL j1', joinApproval1, 201);
if (joinApproval1.json.request?.status !== 'PENDING') {
  fail('join APPROVAL j1 status', joinApproval1.json);
}
await expectInboxType(admin.token, 'GROUP_JOIN_REQUEST', 'admin pending request');

const joinApproval2 = await request('POST', `/groups/${approvalGroupId}/join`, {
  token: joiner2.token,
  body: {},
});
expectStatus('join APPROVAL j2', joinApproval2, 201);

const skillFail = await request('POST', `/groups/${approvalGroupId}/join`, {
  token: lowSkill.token,
  body: {},
});
log('Low skill join (expect 400)', { status: skillFail.status });
expectStatus('skill gate', skillFail, 400);

const pendingList = await request('GET', `/groups/${approvalGroupId}/requests`, {
  token: admin.token,
});
expectStatus('list pending', pendingList, 200);
if (pendingList.json.total !== 2) {
  fail('pending count', pendingList.json);
}

const flushed = await request('PATCH', `/groups/${approvalGroupId}`, {
  token: admin.token,
  body: { joinMode: 'AUTO', title: `Flushed ${stamp}` },
});
expectStatus('PATCH joinMode AUTO flush', flushed, 200);
if (flushed.json.group?.joinMode !== 'AUTO') {
  fail('PATCH joinMode', flushed.json);
}
if (flushed.json.group?.memberCount !== 3) {
  fail('flush memberCount', flushed.json);
}
await expectInboxType(joiner2.token, 'GROUP_APPROVED', 'flush approved j2');

const members = await request(
  'GET',
  `/groups/${approvalGroupId}/members?search=Smoke Joiner`,
  { token: joiner1.token },
);
expectStatus('list members', members, 200);
if (members.json.total < 2) {
  fail('members search total', members.json);
}
if (!members.json.members?.some((row) => row.isAdmin)) {
  fail('members admin flag', members.json);
}

const schedule = await request(
  'GET',
  `/groups/${approvalGroupId}/schedule?date=2026-08-23`,
  { token: joiner1.token },
);
expectStatus('schedule matrix', schedule, 200);
if (schedule.json.dayOfWeek !== 7) {
  fail('schedule dayOfWeek', schedule.json);
}
const courtA = schedule.json.courts?.find((row) => row.name === 'Court A');
const slot1730 = courtA?.slots?.find((row) => row.startsAt === '17:30');
const slot1800 = courtA?.slots?.find((row) => row.startsAt === '18:00');
if (slot1730?.status !== 'BOOKED' || slot1800?.status !== 'BOOKED') {
  fail('schedule BOOKED slots', schedule.json);
}

const fav = await request('POST', `/groups/${approvalGroupId}/favorite`, {
  token: joiner2.token,
});
expectStatus('favorite', fav, 200);

const galleryAdd = await request('POST', `/groups/${approvalGroupId}/gallery`, {
  token: admin.token,
  body: { imageUrl: 'https://cdn.example.com/smoke-group.webp' },
});
expectStatus('gallery add', galleryAdd, 201);
const imageId = galleryAdd.json.image?.imageId;

const galleryList = await request('GET', `/groups/${approvalGroupId}/gallery`, {
  token: joiner1.token,
});
expectStatus('gallery list', galleryList, 200);
if (galleryList.json.total !== 1) {
  fail('gallery total', galleryList.json);
}

const mineManaged = await request('GET', '/groups/mine?tab=managed', {
  token: admin.token,
});
expectStatus('mine managed', mineManaged, 200);

const mineJoined = await request('GET', '/groups/mine?tab=joined', {
  token: joiner1.token,
});
expectStatus('mine joined', mineJoined, 200);

const kicked = await request(
  'POST',
  `/groups/${approvalGroupId}/members/${joiner2.userId}/kick`,
  { token: admin.token },
);
expectStatus('kick member', kicked, 200);
if (kicked.json.group?.memberCount !== 2) {
  fail('kick memberCount', kicked.json);
}
await expectInboxType(joiner2.token, 'GROUP_KICKED', 'member kicked');

const rejoinKicked = await request('POST', `/groups/${approvalGroupId}/join`, {
  token: joiner2.token,
  body: {},
});
log('Rejoin after kick (expect 403)', { status: rejoinKicked.status });
expectStatus('rejoin kicked', rejoinKicked, 403);

const transferred = await request(
  'POST',
  `/groups/${approvalGroupId}/members/${joiner1.userId}/transfer-admin`,
  { token: admin.token },
);
expectStatus('transfer admin', transferred, 200);
if (Number(transferred.json.adminUserId) !== joiner1.userId) {
  fail('transfer adminUserId', transferred.json);
}
await expectInboxType(joiner1.token, 'GROUP_ADMIN_TRANSFERRED', 'admin transferred');

const oldAdminPatch = await request('PATCH', `/groups/${approvalGroupId}`, {
  token: admin.token,
  body: { description: 'should fail' },
});
log('Old admin PATCH (expect 403)', { status: oldAdminPatch.status });
expectStatus('old admin PATCH', oldAdminPatch, 403);

const galleryDelete = await request(
  'DELETE',
  `/groups/${approvalGroupId}/gallery/${imageId}`,
  { token: joiner1.token },
);
expectStatus('gallery delete new admin', galleryDelete, 200);

const deleted = await request('DELETE', `/groups/${approvalGroupId}`, {
  token: joiner1.token,
});
expectStatus('delete group', deleted, 200);

const deletedDetail = await request('GET', `/groups/${approvalGroupId}`, {
  token: joiner1.token,
});
expectStatus('detail after delete', deletedDetail, 404);

console.log('\nSmoke groups OK');
