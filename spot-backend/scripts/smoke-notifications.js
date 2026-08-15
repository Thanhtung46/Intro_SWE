/**
 * Smoke: register → login → seed inbox → list/unread/mark/read-all → due reminder.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const email = domain
  ? `${local}+notif${stamp}@${domain}`
  : `notif_${stamp}@example.com`;
const phoneNumber = `08${String(stamp).slice(-8)}`;
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
    fullName: 'Notif Smoke',
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
  console.error('Set OTP_DEBUG=true for smoke notifications.');
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

const scheduleSeed = await request('POST', '/users/me/schedule/dev/seed', {
  token,
  body: { includeMatch: false, daysFromNow: 3 },
});
log('Seed booking for reminder FK', {
  status: scheduleSeed.status,
  bookingId: scheduleSeed.json.booking?.bookingId,
});
if (scheduleSeed.status !== 201 || !scheduleSeed.json.booking?.bookingId) {
  process.exit(1);
}

const seed = await request('POST', '/notifications/dev/seed', {
  token,
  body: {
    type: 'BOOKING_CREATED',
    title: 'Booking confirmed',
    body: 'Your booking at Field A is confirmed.',
    bookingId: scheduleSeed.json.booking.bookingId,
    dueReminderNow: true,
  },
});
log('Seed', {
  status: seed.status,
  notificationId: seed.json.notification?.notificationId,
  dueReminder: seed.json.dueReminder,
});
if (seed.status !== 201) process.exit(1);

const list = await request('GET', '/notifications', { token });
log('List', { status: list.status, count: list.json.items?.length });
if (list.status !== 200 || !list.json.items?.length) process.exit(1);

const unread = await request('GET', '/notifications/unread-count', { token });
log('Unread count', unread);
if (unread.status !== 200 || unread.json.count < 1) process.exit(1);

const id = seed.json.notification.notificationId;
const marked = await request('PATCH', `/notifications/${id}/read`, { token });
log('Mark read', { status: marked.status, isRead: marked.json.notification?.isRead });
if (marked.status !== 200 || marked.json.notification?.isRead !== true) process.exit(1);

const seed2 = await request('POST', '/notifications/dev/seed', {
  token,
  body: { title: 'Second', body: 'Another row' },
});
if (seed2.status !== 201) process.exit(1);

const readAll = await request('POST', '/notifications/read-all', { token });
log('Read all', readAll);
if (readAll.status !== 200) process.exit(1);

const unreadAfter = await request('GET', '/notifications/unread-count', { token });
if (unreadAfter.status !== 200 || unreadAfter.json.count !== 0) {
  log('Unread after read-all (expect 0)', unreadAfter);
  process.exit(1);
}

const processed = await request('POST', '/notifications/dev/process-due', { token });
log('Process due', processed);
if (processed.status !== 200) process.exit(1);
if (processed.json.sent < 1) {
  console.error('Expected at least one reminder sent');
  process.exit(1);
}

const listAfter = await request('GET', '/notifications?unreadOnly=true', { token });
log('Unread after reminder', {
  status: listAfter.status,
  count: listAfter.json.items?.length,
  types: listAfter.json.items?.map((i) => i.type),
});
if (listAfter.status !== 200) process.exit(1);
if (!listAfter.json.items?.some((i) => i.type === 'BOOKING_REMINDER')) {
  process.exit(1);
}

console.log('\nSmoke notifications OK');
