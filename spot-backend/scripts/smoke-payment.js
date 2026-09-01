/**
 * Smoke: register PLAYER → create booking → payment summary → create payment →
 * dev confirm → poll transaction → assert PAID + bookingCode.
 * Needs server up, OTP_DEBUG=true, PAYMENT_DEBUG=true.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const password = 'Password1!';

function emailFor(tag) {
  return domain ? `${local}+pay${tag}${stamp}@${domain}` : `pay_${tag}_${stamp}@example.com`;
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

if (!config.payment.debug) {
  fail('config', 'Set PAYMENT_DEBUG=true for smoke payment.');
}

async function registerPlayer() {
  const email = emailFor('p');
  const registered = await request('POST', '/auth/register', {
    body: {
      fullName: 'Smoke Payment Player',
      email,
      phoneNumber: `09${String(stamp).slice(-8)}`,
      gender: 'male',
      password,
      confirmPassword: password,
    },
  });
  expectStatus('register', registered, 201);
  const otp = registered.json.debugOtp;
  if (!otp) {
    fail('register', 'Set OTP_DEBUG=true for smoke payment.');
  }

  await request('POST', '/auth/role', { body: { email, role: 'PLAYER' } });
  const verified = await request('POST', '/auth/otp/verify', { body: { email, otp } });
  expectStatus('verify', verified, 200);

  const login = await request('POST', '/auth/login', { body: { email, password } });
  expectStatus('login', login, 200);
  const token = login.json.accessToken;
  if (!token) {
    fail('login', login.json);
  }
  return { email, token };
}

const player = await registerPlayer();
log('Account', { email: player.email });

const seeded = await request('POST', '/users/me/schedule/dev/seed', {
  token: player.token,
  body: { includeMatch: false },
});
expectStatus('dev-seed', seeded, 201);
const fieldId = seeded.json.field?.fieldId;
const bookingDate = seeded.json.booking?.bookingDate;
if (!fieldId || !bookingDate) {
  fail('dev-seed missing ids', seeded.json);
}

const created = await request('POST', '/bookings', {
  token: player.token,
  body: { fieldId, bookingDate, startTime: '10:00', endTime: '11:00' },
});
expectStatus('create booking', created, 201);
const bookingId = created.json.booking?.bookingId;
if (!bookingId || created.json.booking?.status !== 'PENDING_PAYMENT') {
  fail('create booking', created.json);
}

const summary = await request('GET', `/payments/bookings/${bookingId}/summary`, {
  token: player.token,
});
expectStatus('payment summary', summary, 200);
if (summary.json.summary?.payableAmountVnd !== 90000) {
  fail('payable amount', summary.json);
}
log('Summary', { payableAmountVnd: summary.json.summary?.payableAmountVnd });

const payment = await request('POST', '/payments/create', {
  token: player.token,
  body: { bookingId, provider: 'VNPAY' },
});
expectStatus('create payment (instant confirm)', payment, 200);
const transactionId = payment.json.transaction?.transactionId;
const bookingCode = payment.json.booking?.bookingCode ?? payment.json.transaction?.bookingCode;
if (!transactionId || payment.json.transaction?.status !== 'SUCCESS') {
  fail('instant payment confirm', payment.json);
}
if (!bookingCode || !bookingCode.startsWith('SPOT-')) {
  fail('booking code', payment.json);
}
log('Instant payment', { transactionId, bookingCode, status: payment.json.transaction?.status });

const polled = await request('GET', `/payments/transactions/${transactionId}`, {
  token: player.token,
});
expectStatus('poll transaction', polled, 200);
if (
  polled.json.transaction?.status !== 'SUCCESS' ||
  polled.json.transaction?.bookingCode !== bookingCode
) {
  fail('poll transaction', polled.json);
}

const duplicate = await request('POST', '/payments/create', {
  token: player.token,
  body: { bookingId, provider: 'VNPAY' },
});
expectStatus('pay again on paid booking', duplicate, 409);

const invoiceNumber = polled.json.transaction?.invoiceNumber;
if (!invoiceNumber) {
  fail('invoice number missing', polled.json);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const invoiceDir = path.resolve(__dirname, '../uploads/invoices');
if (fs.existsSync(invoiceDir)) {
  const pdfFiles = fs
    .readdirSync(invoiceDir)
    .filter((f) => f.includes(invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')));
  if (!pdfFiles.length) {
    fail('invoice pdf file', { invoiceDir, invoiceNumber });
  }
} else {
  log('Invoice PDF dir (skip — Docker may store under /app/uploads/invoices)', {
    invoiceNumber,
  });
}

console.log('\nSmoke payment OK', { bookingId, bookingCode, transactionId, invoiceNumber });
