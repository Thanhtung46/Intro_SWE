/**
 * Smoke: register → login → seed COMPLETED booking → review → reply → venue rating.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const email = domain
  ? `${local}+review${stamp}@${domain}`
  : `review_${stamp}@example.com`;
const phoneNumber = `07${String(stamp).slice(-8)}`;
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
    fullName: 'Review Smoke',
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
  console.error('Set OTP_DEBUG=true for smoke reviews.');
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

const seed = await request('POST', '/reviews/dev/seed-booking', {
  token,
  body: { daysFromNow: 1 },
});
log('Seed booking', {
  status: seed.status,
  bookingId: seed.json.booking?.bookingId,
  statusBooking: seed.json.booking?.status,
  venueId: seed.json.venue?.venueId,
});
if (seed.status !== 201 || seed.json.booking?.status !== 'COMPLETED') process.exit(1);

const bookingId = seed.json.booking.bookingId;
const venueId = seed.json.venue.venueId;

const review = await request('POST', '/reviews', {
  token,
  body: {
    bookingId,
    rating: 5,
    reviewText: 'Clean field and friendly staff',
  },
});
log('Create review', {
  status: review.status,
  reviewId: review.json.review?.reviewId,
  avgRating: review.json.venueRating?.avgRating,
  ratingCount: review.json.venueRating?.ratingCount,
});
if (review.status !== 201 || !review.json.review?.reviewId) process.exit(1);
if (review.json.venueRating?.ratingCount !== 1) process.exit(1);
if (Number(review.json.venueRating?.avgRating) !== 5) process.exit(1);

const dup = await request('POST', '/reviews', {
  token,
  body: { bookingId, rating: 4 },
});
log('Duplicate review', { status: dup.status, message: dup.json.message });
if (dup.status !== 409) process.exit(1);

const reviewId = review.json.review.reviewId;
const reply = await request('POST', `/reviews/${reviewId}/reply`, {
  token,
  body: { replyText: 'Thanks for your feedback!' },
});
log('Owner reply', {
  status: reply.status,
  replyId: reply.json.reply?.replyId,
});
if (reply.status !== 201 || !reply.json.reply?.replyId) process.exit(1);

const reply2 = await request('POST', `/reviews/${reviewId}/reply`, {
  token,
  body: { replyText: 'Second reply should fail' },
});
log('Duplicate reply', { status: reply2.status, message: reply2.json.message });
if (reply2.status !== 409) process.exit(1);

const rating = await request('GET', `/reviews/venues/${venueId}/rating`, { token });
log('Venue rating', rating);
if (rating.status !== 200) process.exit(1);
if (rating.json.ratingCount !== 1) process.exit(1);
if (Number(rating.json.avgRating) !== 5) process.exit(1);

console.log('\nSmoke reviews OK');
