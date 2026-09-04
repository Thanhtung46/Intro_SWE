/**
 * Smoke: approve owner → facility CRUD → revenue → reviews list/reply.
 * Requires: server up, migration 009, OTP_DEBUG=true, seed-admin run.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@spot.local').toLowerCase();
const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'AdminPass1!';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const ownerEmail = domain
  ? `${local}+ownerops${stamp}@${domain}`
  : `ownerops_${stamp}@example.com`;
const ownerPhone = `09${String(stamp).slice(-8)}`;
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
  return { status: res.status, json, text };
}

function log(step, data) {
  console.log(`\n=== ${step} ===`);
  console.log(JSON.stringify(data, null, 2));
}

const registered = await request('POST', '/auth/register', {
  body: {
    fullName: 'Owner Ops Smoke',
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
  console.error('Set OTP_DEBUG=true for smoke owner ops.');
  process.exit(1);
}

if ((await request('POST', '/auth/role', { body: { email: ownerEmail, role: 'OWNER' } })).status !== 200) {
  process.exit(1);
}
const verified = await request('POST', '/auth/otp/verify', { body: { email: ownerEmail, otp } });
if (verified.status !== 200) process.exit(1);

const verifyReq = await request('POST', '/users/me/verification-requests', {
  token: verified.json.accessToken,
  body: {
    documentUrl: 'https://example.com/license.pdf',
    requestType: 'OWNER_LICENSE',
  },
});
if (verifyReq.status !== 201) process.exit(1);

const adminLogin = await request('POST', '/auth/login', {
  body: { email: adminEmail, password: adminPassword },
});
if (adminLogin.status !== 200) {
  console.error('Run npm run seed:admin first.');
  process.exit(1);
}
const adminToken = adminLogin.json.accessToken;

const approved = await request(
  'POST',
  `/admin/approvals/${verifyReq.json.request.verificationReqId}/approve`,
  { token: adminToken },
);
log('Approve owner', { status: approved.status });
if (approved.status !== 200) process.exit(1);

const ownerLogin = await request('POST', '/auth/login', {
  body: { email: ownerEmail, password: ownerPassword },
});
if (ownerLogin.status !== 200) process.exit(1);
const ownerToken = ownerLogin.json.accessToken;

const createVenue = await request('POST', '/owner/facilities/venues', {
  token: ownerToken,
  body: {
    name: `Owner Ops Venue ${stamp}`,
    address: '456 Le Van Viet, Thu Duc',
    amenities: 'Parking, Shower',
    openingHours: '06:00',
    closingHours: '23:00',
  },
});
log('Create venue', { status: createVenue.status, venueId: createVenue.json.venue?.venueId });
if (createVenue.status !== 201) process.exit(1);
const venueId = createVenue.json.venue.venueId;

const createField = await request('POST', `/owner/facilities/venues/${venueId}/fields`, {
  token: ownerToken,
  body: {
    name: 'Court 1',
    sportType: 'Badminton',
    pricePerHour: 150000,
    peakPricePerHour: 200000,
    offPeakPricePerHour: 120000,
    capacity: 4,
  },
});
log('Create field', { status: createField.status, fieldId: createField.json.field?.fieldId });
if (createField.status !== 201) process.exit(1);

const listVenues = await request('GET', '/owner/facilities/venues', { token: ownerToken });
if (listVenues.status !== 200 || !listVenues.json.items?.length) process.exit(1);

const scheduleSeed = await request('POST', '/users/me/schedule/dev/seed', {
  token: ownerToken,
  body: { includeMatch: false, daysFromNow: 1 },
});
log('Seed paid booking', {
  status: scheduleSeed.status,
  bookingId: scheduleSeed.json.booking?.bookingId,
});
if (scheduleSeed.status !== 201) process.exit(1);

const reviewSeed = await request('POST', '/reviews/dev/seed-booking', {
  token: ownerToken,
  body: { daysFromNow: 1 },
});
if (reviewSeed.status !== 201) process.exit(1);

const reviewCreate = await request('POST', '/reviews', {
  token: ownerToken,
  body: {
    bookingId: reviewSeed.json.booking.bookingId,
    rating: 5,
    reviewText: 'Owner ops smoke review',
  },
});
log('Create review', { status: reviewCreate.status });
if (reviewCreate.status !== 201) process.exit(1);

const from = new Date();
from.setDate(from.getDate() - 7);
const to = new Date();
to.setDate(to.getDate() + 14);
const fromStr = from.toISOString().slice(0, 10);
const toStr = to.toISOString().slice(0, 10);

const revenue = await request(
  'GET',
  `/owner/revenue/summary?from=${fromStr}&to=${toStr}`,
  { token: ownerToken },
);
log('Revenue summary', {
  status: revenue.status,
  totalRevenue: revenue.json.totalRevenue,
  bySport: revenue.json.bySport?.length,
});
if (revenue.status !== 200) process.exit(1);

const timeseries = await request(
  'GET',
  `/owner/revenue/timeseries?from=${fromStr}&to=${toStr}&granularity=week`,
  { token: ownerToken },
);
if (timeseries.status !== 200 || !Array.isArray(timeseries.json.points)) process.exit(1);

const exportCsv = await request(
  'GET',
  `/owner/revenue/export?from=${fromStr}&to=${toStr}&format=csv`,
  { token: ownerToken },
);
log('Revenue export', {
  status: exportCsv.status,
  sample: exportCsv.text?.slice(0, 80),
});
if (exportCsv.status !== 200 || !exportCsv.text.includes('booking_id')) process.exit(1);

const reviews = await request('GET', '/owner/reviews?limit=10', { token: ownerToken });
log('Owner reviews', {
  status: reviews.status,
  count: reviews.json.items?.length,
});
if (reviews.status !== 200 || !reviews.json.items?.length) process.exit(1);

const reviewId = reviews.json.items[0].reviewId;
const reviewDetail = await request('GET', `/owner/reviews/${reviewId}`, {
  token: ownerToken,
});
if (reviewDetail.status !== 200) process.exit(1);

if (!reviews.json.items[0].hasReply) {
  const reply = await request('POST', `/owner/reviews/${reviewId}/reply`, {
    token: ownerToken,
    body: { replyText: 'Thanks for visiting our venue!' },
  });
  log('Reply review', { status: reply.status });
  if (reply.status !== 201) process.exit(1);
}

const dashboard = await request('GET', '/owner/dashboard/summary', { token: ownerToken });
log('Dashboard KPI', {
  status: dashboard.status,
  monthlyRevenue: dashboard.json.kpis?.monthlyRevenue?.amount,
  occupancy: dashboard.json.kpis?.occupancyRate?.percent,
  trends: dashboard.json.bookingTrends?.points?.length,
  facilityCards: dashboard.json.facilityCards?.length,
});
if (dashboard.status !== 200) process.exit(1);
if (!dashboard.json.kpis?.monthlyRevenue) process.exit(1);
if (!Array.isArray(dashboard.json.bookingTrends?.points)) process.exit(1);
if (dashboard.json.bookingTrends.points.length !== 7) process.exit(1);

console.log('\nSmoke owner ops OK');
