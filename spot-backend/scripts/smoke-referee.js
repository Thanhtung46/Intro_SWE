/**
 * Smoke: referee signup batch → admin approve → board apply → booking hire → accept.
 * Requires: server up, migrations 015–022, OTP_DEBUG=true, seed-admin run.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@spot.local').toLowerCase();
const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'AdminPass1!';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const refereeEmail = domain
  ? `${local}+ref${stamp}@${domain}`
  : `referee_${stamp}@example.com`;
const playerEmail = domain
  ? `${local}+plr${stamp}@${domain}`
  : `player_${stamp}@example.com`;
const phoneBase = `09${String(stamp).slice(-8)}`;
const password = 'Password1!';

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
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

async function get(path, token) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
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

async function del(path, body, token) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
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

function assertOk(label, res, expected = 200) {
  if (res.status !== expected) {
    throw new Error(`${label} failed: ${res.status} ${JSON.stringify(res.json)}`);
  }
}

// --- Register referee ---
const registered = await post('/auth/register', {
  fullName: 'Ref Smoke',
  email: refereeEmail,
  phoneNumber: phoneBase,
  gender: 'male',
  password,
  confirmPassword: password,
});
log('register referee', registered);
assertOk('register', registered, 201);

const otp = registered.json.debugOtp;
if (!otp) {
  console.error('Set OTP_DEBUG=true for smoke referee.');
  process.exit(1);
}

// Flow: Register → OTP → Role. OTP verify happens before the role is chosen,
// so it returns no token; the pending-referee token now comes from /auth/role.
const verified = await post('/auth/otp/verify', { email: refereeEmail, otp });
log('verify referee', verified);
assertOk('verify', verified, 200);

const roleRes = await post('/auth/role', {
  email: refereeEmail,
  role: 'REFEREE',
});
log('role REFEREE', roleRes);
assertOk('role', roleRes, 200);

const pendingToken = roleRes.json.accessToken;
if (!pendingToken) {
  throw new Error('Expected accessToken from POST /auth/role (email already verified → SUBMIT_VERIFICATION)');
}
if (roleRes.json.nextStep !== 'SUBMIT_VERIFICATION') {
  throw new Error(`Expected nextStep SUBMIT_VERIFICATION from /auth/role, got ${roleRes.json.nextStep}`);
}

const batch = await post(
  '/users/me/verification-requests/batch',
  {
    documents: [
      { documentKind: 'ID_FRONT', documentUrl: 'https://example.com/id-front.jpg' },
      { documentKind: 'ID_BACK', documentUrl: 'https://example.com/id-back.jpg' },
      { documentKind: 'VFF_LICENSE', documentUrl: 'https://example.com/vff.pdf' },
    ],
  },
  pendingToken,
);
log('batch verification', batch);
assertOk('batch', batch, 201);

// A pending applicant can read their own submitted docs (the /referee/* cert
// route is ACTIVE-only).
const myReqs = await get('/users/me/verification-requests', pendingToken);
log('my verification requests', myReqs);
assertOk('my verification requests', myReqs, 200);
if ((myReqs.json.requests ?? []).length !== 3) {
  throw new Error(`Expected 3 verification requests, got ${(myReqs.json.requests ?? []).length}`);
}
if (!myReqs.json.requests.every((r) => r.status === 'PENDING')) {
  throw new Error('Expected all verification requests to be PENDING before approval');
}

// Login while pending is still 403, but now carries a nextStep hint so the
// client can guide the user instead of showing a dead end.
const pendingLogin = await post('/auth/login', { email: refereeEmail, password });
log('pending referee login', pendingLogin);
if (pendingLogin.status !== 403) {
  throw new Error(`Expected 403 for pending referee login, got ${pendingLogin.status}`);
}
if (pendingLogin.json.details?.nextStep !== 'SUBMIT_VERIFICATION') {
  throw new Error(
    `Expected details.nextStep SUBMIT_VERIFICATION on pending login 403, got ${JSON.stringify(pendingLogin.json.details)}`,
  );
}

const adminLogin = await post('/auth/login', {
  email: adminEmail,
  password: adminPassword,
});
log('admin login', adminLogin);
assertOk('admin login', adminLogin, 200);

const approvals = await get('/admin/approvals?role=REFEREE&status=PENDING', adminLogin.json.accessToken);
log('list approvals', approvals);
assertOk('approvals', approvals, 200);

const reqId = approvals.json.items?.[0]?.verificationReqId;
if (!reqId) throw new Error('No pending referee approval found');

const approved = await post(
  `/admin/approvals/${reqId}/approve`,
  { certifiedSportTypes: ['football'] },
  adminLogin.json.accessToken,
);
log('approve referee', approved);
assertOk('approve', approved, 200);

const refLogin = await post('/auth/login', { email: refereeEmail, password });
log('referee login', refLogin);
assertOk('referee login', refLogin, 200);
const refToken = refLogin.json.accessToken;

const refMe = await get('/referee/me', refToken);
log('referee me', refMe);
assertOk('referee me', refMe, 200);
const refereeUserId = refMe.json.profile?.userId;

// --- Activation acknowledgement (one-time "Account Activated", server-side) ---
if (refMe.json.profile?.activationAcknowledged !== false) {
  throw new Error('Freshly approved referee should have activationAcknowledged=false');
}
const ack1 = await post('/referee/me/activation-ack', {}, refToken);
log('activation ack', ack1);
assertOk('activation ack', ack1, 200);
const refMe2 = await get('/referee/me', refToken);
assertOk('referee me after ack', refMe2, 200);
if (refMe2.json.profile?.activationAcknowledged !== true) {
  throw new Error('activationAcknowledged must be true after POST /referee/me/activation-ack');
}
const ack2 = await post('/referee/me/activation-ack', {}, refToken);
assertOk('activation ack (idempotent)', ack2, 200);

// --- Player + venue seed + booking ---
const playerReg = await post('/auth/register', {
  fullName: 'Player Smoke',
  email: playerEmail,
  phoneNumber: `09${String(stamp + 1).slice(-8)}`,
  gender: 'male',
  password,
  confirmPassword: password,
});
assertOk('player register', playerReg, 201);
const playerOtp = playerReg.json.debugOtp;
if (!playerOtp) throw new Error('OTP_DEBUG required for player register');

await post('/auth/role', { email: playerEmail, role: 'PLAYER' });
const playerVerify = await post('/auth/otp/verify', { email: playerEmail, otp: playerOtp });
assertOk('player verify', playerVerify, 200);
const playerLogin = await post('/auth/login', { email: playerEmail, password });
log('player login', playerLogin);
assertOk('player login', playerLogin, 200);
const playerToken = playerLogin.json.accessToken;

const seed = await post('/users/me/schedule/dev/seed', {}, playerToken);
log('seed venue', seed);
assertOk('seed', seed, 201);

const venueId = seed.json.venue?.venueId;
const fieldId = seed.json.field?.fieldId;

const boardByProvince = await get(
  '/referee/board?sport=football&province=79&city=778',
  refToken,
);
log('board province filter', boardByProvince);
assertOk('board province', boardByProvince, 200);
if (!(boardByProvince.json.venues ?? []).some((v) => v.venueId === venueId)) {
  throw new Error('Seeded venue not found with province=79&city=778');
}

const favoriteVenue = await post(`/referee/venues/${venueId}/favorite`, {}, refToken);
log('favorite venue', favoriteVenue);
assertOk('favorite venue', favoriteVenue, 200);

const boardFavorited = await get('/referee/board?sport=football&favorited=true', refToken);
log('board favorited', boardFavorited);
assertOk('board favorited', boardFavorited, 200);
if (!(boardFavorited.json.venues ?? []).some((v) => v.venueId === venueId)) {
  throw new Error('Favorited venue missing from favorited board filter');
}

const boardSearch = await get(
  `/referee/board?sport=football&q=${encodeURIComponent('Smoke Venue')}`,
  refToken,
);
log('board search q', boardSearch);
assertOk('board search', boardSearch, 200);

const boardBefore = await get('/referee/board?sport=football', refToken);
log('board before apply', boardBefore);
assertOk('board', boardBefore, 200);

const registerVenue = await post(
  `/referee/venues/${venueId}/register`,
  { sportType: 'football' },
  refToken,
);
log('register venue', registerVenue);
assertOk('register venue', registerVenue, 201);

const boardAfter = await get('/referee/board?sport=football', refToken);
log('board after apply', boardAfter);
assertOk('board after', boardAfter, 200);

const bookingDate = seed.json.booking?.bookingDate
  ?? new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);

const booking = await post(
  '/bookings',
  {
    fieldId,
    bookingDate,
    startTime: '19:00',
    endTime: '20:00',
    hireReferee: true,
  },
  playerToken,
);
log('create booking hire referee', booking);
assertOk('booking', booking, 201);

const bookingId = booking.json.booking?.bookingId;
const markPaid = await post(`/bookings/${bookingId}/dev/mark-paid`, {}, playerToken);
log('mark paid + fanout', markPaid);
assertOk('mark paid', markPaid, 200);

const notif = await get('/notifications?limit=5', refToken);
log('referee notifications', notif);
assertOk('notifications', notif, 200);
const invitationNotif = (notif.json.items ?? []).find(
  (n) => n.type === 'REFEREE_INVITATION',
);
if (!invitationNotif) {
  throw new Error('Expected REFEREE_INVITATION notification for referee');
}

const pendingInv = await get('/referee/invitations?tab=pending', refToken);
log('pending invitations', pendingInv);
assertOk('pending inv', pendingInv, 200);

const assignmentId = pendingInv.json.matchInvitations?.[0]?.assignmentId;
if (!assignmentId) throw new Error('No match invitation after fan-out');

const accept = await post(`/referee/assignments/${assignmentId}/accept`, {}, refToken);
log('accept assignment', accept);
assertOk('accept', accept, 200);

const confirmed = await get('/referee/invitations?tab=confirmed', refToken);
log('confirmed tab', confirmed);
assertOk('confirmed', confirmed, 200);

const complete = await post(
  `/referee/assignments/${assignmentId}/dev/complete`,
  {},
  refToken,
);
log('dev complete assignment', complete);
assertOk('dev complete', complete, 200);

const playerNotif = await get('/notifications', playerToken);
log('player notifications', playerNotif);
assertOk('player notifications', playerNotif, 200);
const ratingPrompt = (playerNotif.json.items ?? []).find(
  (n) => n.type === 'REFEREE_RATING_REQUEST',
);
if (!ratingPrompt) {
  throw new Error('Expected REFEREE_RATING_REQUEST notification for player');
}
if (ratingPrompt.data?.bookingId !== bookingId) {
  throw new Error('Rating prompt missing bookingId for FE navigation');
}

const earningsMonthly = await get('/referee/earnings/monthly?months=6', refToken);
log('earnings monthly', earningsMonthly);
assertOk('earnings monthly', earningsMonthly, 200);
if (!Array.isArray(earningsMonthly.json.buckets)) {
  throw new Error('earnings/monthly must return a buckets array');
}

const earningsMonthlyBad = await get('/referee/earnings/monthly?months=99', refToken);
log('earnings monthly (months out of range)', earningsMonthlyBad);
assertOk('earnings monthly rejects months > 12', earningsMonthlyBad, 400);

const nowMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).slice(0, 7);
const historyThisMonth = await get(`/referee/earnings/history?month=${nowMonth}`, refToken);
log('earnings history (this month)', historyThisMonth);
assertOk('earnings history month-scoped', historyThisMonth, 200);
if (historyThisMonth.json.month !== nowMonth) {
  throw new Error('earnings/history should echo the month filter');
}
const historyFarPast = await get('/referee/earnings/history?month=2000-01', refToken);
assertOk('earnings history empty past month', historyFarPast, 200);
if (historyFarPast.json.total !== 0) {
  throw new Error('earnings/history month=2000-01 should have total 0');
}

const refereeReview = await post(
  '/reviews/referee',
  { bookingId, rating: 4.5 },
  playerToken,
);
log('player review referee', refereeReview);
assertOk('referee review', refereeReview, 201);

const refRating = await get(`/reviews/referees/${refereeUserId}/rating`, playerToken);
log('referee rating aggregate', refRating);
assertOk('referee rating', refRating, 200);

const cancelReg = await del(
  `/referee/venues/${venueId}/register`,
  { sportType: 'football' },
  refToken,
);
log('cancel venue registration', cancelReg);
assertOk('cancel reg', cancelReg, 200);

console.log('\n✅ smoke:referee passed');
