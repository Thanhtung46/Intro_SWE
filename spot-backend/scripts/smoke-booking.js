/**
 * Smoke: register PLAYER → dev-seed a venue/field → create a booking →
 * repeat the same request (expect 409 conflict) → confirm it shows up in
 * GET /users/me/schedule. Needs server up and OTP_DEBUG=true.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const password = 'Password1!';

function emailFor(tag) {
  return domain ? `${local}+b${tag}${stamp}@${domain}` : `b_${tag}_${stamp}@example.com`;
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
    body: { fullName, email, phoneNumber, gender, password, confirmPassword: password },
  });
  expectStatus(`register ${tag}`, registered, 201);
  const otp = registered.json.debugOtp;
  if (!otp) {
    fail(`register ${tag}`, 'Set OTP_DEBUG=true for smoke booking.');
  }

  const role = await request('POST', '/auth/role', { body: { email, role: 'PLAYER' } });
  expectStatus(`role ${tag}`, role, 200);

  const verified = await request('POST', '/auth/otp/verify', { body: { email, otp } });
  expectStatus(`verify ${tag}`, verified, 200);

  const login = await request('POST', '/auth/login', { body: { email, password } });
  expectStatus(`login ${tag}`, login, 200);
  const token = login.json.accessToken;
  if (!token) {
    fail(`login ${tag}`, login.json);
  }

  return { email, token };
}

const player = await registerPlayer({
  tag: 'p',
  fullName: 'Smoke Booking Player',
  gender: 'female',
  phoneNumber: `09${String(stamp).slice(-8)}`,
});
log('Account', { email: player.email });

// Dev-seed also creates its own 18:00-19:00 booking on this field/date — use
// a different hour (10:00-11:00) below so it doesn't collide.
const seeded = await request('POST', '/users/me/schedule/dev/seed', {
  token: player.token,
  body: { includeMatch: false },
});
expectStatus('dev-seed venue/field', seeded, 201);
const fieldId = seeded.json.field?.fieldId;
const bookingDate = seeded.json.booking?.bookingDate;
if (!fieldId || !bookingDate) {
  fail('dev-seed missing ids', seeded.json);
}
log('Seeded', { fieldId, bookingDate });

const bookingBody = { fieldId, bookingDate, startTime: '10:00', endTime: '11:00' };

const created = await request('POST', '/bookings', { token: player.token, body: bookingBody });
expectStatus('create booking', created, 201);
const bookingId = created.json.booking?.bookingId;
if (!bookingId || created.json.booking?.status !== 'PENDING_PAYMENT') {
  fail('create booking shape', created.json);
}
if (created.json.booking?.totalAmount !== 300000 || created.json.booking?.depositAmount !== 90000) {
  fail('create booking amounts', created.json);
}

const conflict = await request('POST', '/bookings', { token: player.token, body: bookingBody });
log('Repeat same booking (expect 409)', { status: conflict.status });
expectStatus('repeat booking conflict', conflict, 409);

const pastBooking = await request('POST', '/bookings', {
  token: player.token,
  body: { ...bookingBody, bookingDate: '2020-01-01' },
});
log('Past-date booking (expect 400)', { status: pastBooking.status });
expectStatus('past date booking', pastBooking, 400);

const missingField = await request('POST', '/bookings', {
  token: player.token,
  body: { ...bookingBody, fieldId: 99999999, startTime: '13:00', endTime: '14:00' },
});
log('Booking on missing field (expect 404)', { status: missingField.status });
expectStatus('missing field booking', missingField, 404);

const schedule = await request('GET', '/users/me/schedule?type=booking&limit=1', {
  token: player.token,
});
expectStatus('GET /users/me/schedule', schedule, 200);
if (schedule.json.items?.[0]?.bookingId !== bookingId) {
  fail('new booking not first in schedule', { expected: bookingId, got: schedule.json });
}

console.log('\nSmoke booking OK');
