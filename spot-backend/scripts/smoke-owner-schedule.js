/**
 * Smoke: approve owner → create venue/field → GET schedule → create manual
 * booking on an open slot → confirm 409 on repeat → confirm 422 on a
 * MAINTENANCE field.
 * Requires: server up, migrations 004/009/010, OTP_DEBUG=true, seed-admin run.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@spot.local').toLowerCase();
const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'AdminPass1!';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const ownerEmail = domain
  ? `${local}+ownersched${stamp}@${domain}`
  : `ownersched_${stamp}@example.com`;
const ownerPhone = `08${String(stamp).slice(-8)}`;
const ownerPassword = 'Password1!';

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
    fullName: 'Owner Schedule Smoke',
    email: ownerEmail,
    phoneNumber: ownerPhone,
    gender: 'male',
    password: ownerPassword,
    confirmPassword: ownerPassword,
  },
});
if (registered.status !== 201) process.exit(1);
const otp = registered.json.debugOtp;
if (!otp) {
  console.error('Set OTP_DEBUG=true for smoke owner schedule.');
  process.exit(1);
}

if ((await request('POST', '/auth/role', { body: { email: ownerEmail, role: 'OWNER' } })).status !== 200) {
  process.exit(1);
}
const verified = await request('POST', '/auth/otp/verify', { body: { email: ownerEmail, otp } });
if (verified.status !== 200) process.exit(1);

const verifyReq = await request('POST', '/users/me/verification-requests', {
  token: verified.json.accessToken,
  body: { documentUrl: 'https://example.com/license.pdf', requestType: 'OWNER_LICENSE' },
});
if (verifyReq.status !== 201) process.exit(1);

const adminLogin = await request('POST', '/auth/login', {
  body: { email: adminEmail, password: adminPassword },
});
if (adminLogin.status !== 200) {
  console.error('Run npm run seed:admin first.');
  process.exit(1);
}
const approved = await request(
  'POST',
  `/admin/approvals/${verifyReq.json.request.verificationReqId}/approve`,
  { token: adminLogin.json.accessToken },
);
if (approved.status !== 200) process.exit(1);

const ownerLogin = await request('POST', '/auth/login', {
  body: { email: ownerEmail, password: ownerPassword },
});
if (ownerLogin.status !== 200) process.exit(1);
const ownerToken = ownerLogin.json.accessToken;

const createVenue = await request('POST', '/owner/facilities/venues', {
  token: ownerToken,
  body: {
    name: `Owner Schedule Venue ${stamp}`,
    address: '789 Vo Van Ngan, Thu Duc',
    openingHours: '06:00',
    closingHours: '23:00',
  },
});
if (createVenue.status !== 201) process.exit(1);
const venueId = createVenue.json.venue.venueId;

const activeField = await request('POST', `/owner/facilities/venues/${venueId}/fields`, {
  token: ownerToken,
  body: { name: 'Court A', sportType: 'Badminton', pricePerHour: 100000 },
});
if (activeField.status !== 201) process.exit(1);
const activeFieldId = activeField.json.field.fieldId;

const maintenanceField = await request('POST', `/owner/facilities/venues/${venueId}/fields`, {
  token: ownerToken,
  body: {
    name: 'Court B',
    sportType: 'Badminton',
    pricePerHour: 100000,
    status: 'MAINTENANCE',
  },
});
if (maintenanceField.status !== 201) process.exit(1);
const maintenanceFieldId = maintenanceField.json.field.fieldId;

const today = new Date().toISOString().slice(0, 10);

const scheduleBefore = await request(
  'GET',
  `/owner/schedule?venueId=${venueId}&date=${today}`,
  { token: ownerToken },
);
log('Schedule before booking', {
  status: scheduleBefore.status,
  fieldCount: scheduleBefore.json.fields?.length,
});
if (scheduleBefore.status !== 200) process.exit(1);
if (scheduleBefore.json.fields.length !== 2) process.exit(1);

const activeFieldSlots = scheduleBefore.json.fields.find((f) => f.fieldId === activeFieldId);
const openSlot = activeFieldSlots.slots.find((s) => s.state === 'AVAILABLE');
if (!openSlot) {
  console.error('No available slot found — check venue opening hours.');
  process.exit(1);
}

const created = await request('POST', '/owner/schedule/bookings', {
  token: ownerToken,
  body: {
    fieldId: activeFieldId,
    bookingDate: today,
    startTime: openSlot.startTime,
    endTime: openSlot.endTime,
    customerName: 'Walk-in Customer',
    customerPhone: '0909999999',
    totalAmount: 50000,
  },
});
log('Create manual booking', { status: created.status, bookingId: created.json.booking?.bookingId });
if (created.status !== 201) process.exit(1);

const conflict = await request('POST', '/owner/schedule/bookings', {
  token: ownerToken,
  body: {
    fieldId: activeFieldId,
    bookingDate: today,
    startTime: openSlot.startTime,
    endTime: openSlot.endTime,
    customerName: 'Second Customer',
    totalAmount: 50000,
  },
});
log('Repeat same slot (expect 409)', { status: conflict.status });
if (conflict.status !== 409) process.exit(1);

const maintenanceFieldSlotsBefore = scheduleBefore.json.fields.find(
  (f) => f.fieldId === maintenanceFieldId,
);
if (maintenanceFieldSlotsBefore.slots.length !== 0) process.exit(1);

const blocked = await request('POST', '/owner/schedule/bookings', {
  token: ownerToken,
  body: {
    fieldId: maintenanceFieldId,
    bookingDate: today,
    startTime: '10:00',
    endTime: '10:30',
    customerName: 'Should Fail',
    totalAmount: 50000,
  },
});
log('Book on MAINTENANCE field (expect 422)', { status: blocked.status });
if (blocked.status !== 422) process.exit(1);

const scheduleAfter = await request(
  'GET',
  `/owner/schedule?venueId=${venueId}&date=${today}`,
  { token: ownerToken },
);
const bookedSlot = scheduleAfter.json.fields
  .find((f) => f.fieldId === activeFieldId)
  .slots.find((s) => s.startTime === openSlot.startTime);
log('Slot state after booking', bookedSlot);
if (bookedSlot.state !== 'UNPAID') process.exit(1);

const cancelled = await request(
  'POST',
  `/owner/schedule/bookings/${created.json.booking.bookingId}/cancel`,
  { token: ownerToken },
);
log('Cancel booking', { status: cancelled.status, status2: cancelled.json.booking?.status });
if (cancelled.status !== 200 || cancelled.json.booking.status !== 'CANCELLED') process.exit(1);

console.log('\nSmoke owner schedule OK');
