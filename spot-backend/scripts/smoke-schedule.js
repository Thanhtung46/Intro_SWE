/**
 * Smoke: register → login → seed schedule → GET /users/me/schedule (+ type filters).
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const email = domain
  ? `${local}+sched${stamp}@${domain}`
  : `sched_${stamp}@example.com`;
const phoneNumber = `09${String(stamp).slice(-8)}`;
const password = 'Password1!';

async function request(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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

const registered = await request('POST', '/auth/register', {
  body: {
    fullName: 'Schedule Smoke',
    email,
    phoneNumber,
    gender: 'male',
    password,
    confirmPassword: password,
  },
});
log('Register', { status: registered.status });
if (registered.status !== 201) process.exit(1);
const otp = registered.json.debugOtp;
if (!otp) {
  console.error('Set OTP_DEBUG=true for smoke schedule.');
  process.exit(1);
}

if ((await request('POST', '/auth/role', { body: { email, role: 'PLAYER' } })).status !== 200) {
  process.exit(1);
}
if ((await request('POST', '/auth/otp/verify', { body: { email, otp } })).status !== 200) {
  process.exit(1);
}

const login = await request('POST', '/auth/login', { body: { email, password } });
log('Login', { status: login.status });
if (login.status !== 200) process.exit(1);
const token = login.json.accessToken;

const seed = await request('POST', '/users/me/schedule/dev/seed', {
  token,
  body: { includeMatch: true, daysFromNow: 3 },
});
log('Seed', {
  status: seed.status,
  bookingId: seed.json.booking?.bookingId,
  matchId: seed.json.match?.matchId,
});
if (seed.status !== 201 || !seed.json.booking?.bookingId) process.exit(1);

const all = await request('GET', '/users/me/schedule', { token });
log('Schedule all', {
  status: all.status,
  timezone: all.json.timezone,
  count: all.json.items?.length,
  types: all.json.items?.map((i) => i.type),
});
if (all.status !== 200 || all.json.timezone !== 'Asia/Bangkok') process.exit(1);
if (!all.json.items?.some((i) => i.type === 'BOOKING')) process.exit(1);
if (!all.json.items?.some((i) => i.type === 'MATCH')) process.exit(1);

const bookings = await request('GET', '/users/me/schedule?type=booking', { token });
log('Schedule booking', {
  status: bookings.status,
  count: bookings.json.items?.length,
  types: bookings.json.items?.map((i) => i.type),
});
if (bookings.status !== 200) process.exit(1);
if (!bookings.json.items?.every((i) => i.type === 'BOOKING')) process.exit(1);
if (!bookings.json.items?.length) process.exit(1);

const matches = await request('GET', '/users/me/schedule?type=match', { token });
log('Schedule match', {
  status: matches.status,
  count: matches.json.items?.length,
  types: matches.json.items?.map((i) => i.type),
});
if (matches.status !== 200) process.exit(1);
if (!matches.json.items?.every((i) => i.type === 'MATCH')) process.exit(1);
if (!matches.json.items?.length) process.exit(1);

const bookingDate = String(seed.json.booking.bookingDate).slice(0, 10);
const day = await request(
  'GET',
  `/users/me/schedule?from=${bookingDate}&to=${bookingDate}`,
  { token },
);
log('Schedule day window', {
  status: day.status,
  count: day.json.items?.length,
  bookingDate,
});
if (day.status !== 200 || !day.json.items?.length) process.exit(1);

const profile = await request('GET', '/users/me/profile', { token });
log('Main profile', {
  status: profile.status,
  hostedMatches: profile.json.stats?.hostedMatches,
  joinedMatches: profile.json.stats?.joinedMatches,
  completedBookings: profile.json.stats?.completedBookings,
  reviewsCount: profile.json.stats?.reviewsCount,
  avgRating: profile.json.stats?.avgRating,
  joinedAt: profile.json.stats?.joinedAt,
});
if (profile.status !== 200) process.exit(1);
if (profile.json.user?.email !== email) process.exit(1);
if (profile.json.stats?.hostedMatches < 1) process.exit(1);
if (profile.json.stats?.joinedMatches !== 0) process.exit(1);
if (profile.json.stats?.completedBookings !== 0) process.exit(1);
if (profile.json.stats?.reviewsCount !== 0) process.exit(1);
if (profile.json.stats?.avgRating !== null) process.exit(1);
if (!profile.json.stats?.joinedAt) process.exit(1);

console.log('\nSmoke schedule OK');
