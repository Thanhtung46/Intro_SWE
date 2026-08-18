/**
 * Smoke: register PLAYER → dev-seed a venue/field/booking → list venues by
 * sport → venue detail → field availability (confirms the seeded booking's
 * slot is marked unavailable). Needs server up and OTP_DEBUG=true.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const password = 'Password1!';

function emailFor(tag) {
  return domain ? `${local}+v${tag}${stamp}@${domain}` : `v_${tag}_${stamp}@example.com`;
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
    fail(`register ${tag}`, 'Set OTP_DEBUG=true for smoke venues.');
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
  fullName: 'Smoke Venue Player',
  gender: 'male',
  phoneNumber: `08${String(stamp).slice(-8)}`,
});
log('Account', { email: player.email });

const seeded = await request('POST', '/users/me/schedule/dev/seed', {
  token: player.token,
  body: {},
});
expectStatus('dev-seed venue/field/booking', seeded, 201);
const venueId = seeded.json.venue?.venueId;
const fieldId = seeded.json.field?.fieldId;
const bookingDate = seeded.json.booking?.bookingDate;
if (!venueId || !fieldId || !bookingDate) {
  fail('dev-seed missing ids', seeded.json);
}
log('Seeded', { venueId, fieldId, bookingDate });

const list = await request('GET', '/venues?sport=football', { token: player.token });
expectStatus('list venues', list, 200);
const listedIds = (list.json.venues || []).map((v) => v.venueId);
if (!listedIds.includes(venueId)) {
  fail('seeded venue missing from list', { listedIds, venueId });
}

const badSport = await request('GET', '/venues?sport=tennis', { token: player.token });
log('List with unsupported sport (expect 400)', { status: badSport.status });
expectStatus('list unsupported sport', badSport, 400);

const detail = await request('GET', `/venues/${venueId}`, { token: player.token });
expectStatus('venue detail', detail, 200);
if (detail.json.venue?.venueId !== venueId) {
  fail('venue detail id mismatch', detail.json);
}
const detailFieldIds = (detail.json.fields || []).map((f) => f.fieldId);
if (!detailFieldIds.includes(fieldId)) {
  fail('venue detail missing seeded field', detail.json);
}

const missingDetail = await request('GET', '/venues/99999999', { token: player.token });
log('Detail for missing venue (expect 404)', { status: missingDetail.status });
expectStatus('detail missing venue', missingDetail, 404);

const availability = await request(
  'GET',
  `/venues/${venueId}/fields/${fieldId}/availability?date=${bookingDate}`,
  { token: player.token },
);
expectStatus('field availability', availability, 200);
const bookedSlot = (availability.json.slots || []).find((s) => s.startTime === '18:00');
if (!bookedSlot || bookedSlot.available !== false) {
  fail('seeded booking slot not marked unavailable', availability.json);
}
const openSlot = (availability.json.slots || []).find((s) => s.startTime === '10:00');
if (!openSlot || openSlot.available !== true) {
  fail('unrelated slot unexpectedly unavailable', availability.json);
}

const pastDate = await request(
  'GET',
  `/venues/${venueId}/fields/${fieldId}/availability?date=2020-01-01`,
  { token: player.token },
);
log('Availability for past date (expect 400)', { status: pastDate.status });
expectStatus('availability past date', pastDate, 400);

console.log('\nSmoke venues OK');
