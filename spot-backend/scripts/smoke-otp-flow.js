/**
 * End-to-end OTP smoke test:
 * 1) verify SMTP
 * 2) register (sends Gmail OTP)
 * 3) verify with debugOtp
 * Uses SMTP_USER as recipient via Gmail +alias.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';
import { verifySmtpConnection } from '../src/shared/utils/mailer.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = config.smtp.user.split('@');
const email = `${local}+spot${stamp}@${domain}`;
const phoneNumber = `09${String(stamp).slice(-8)}`;

function log(step, data) {
  console.log(`\n=== ${step} ===`);
  console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

const smtp = await verifySmtpConnection();
log('SMTP verify', smtp);
if (!smtp.ok) {
  console.error('SMTP is not ready. Fix .env SMTP_* then retry.');
  process.exit(1);
}

const health = await fetch(`${baseUrl}/health`);
log('Health', { status: health.status, body: await health.json() });

const registerBody = {
  fullName: 'OTP Smoke Test',
  email,
  phoneNumber,
  gender: 'male',
  password: 'Password1',
  confirmPassword: 'Password1',
};

const registered = await post('/auth/register', registerBody);
log('Register', registered);
if (registered.status !== 201) {
  process.exit(1);
}

const otp = registered.json.debugOtp;
if (!otp) {
  console.error('Missing debugOtp. Set OTP_DEBUG=true in .env for smoke tests.');
  process.exit(1);
}

const verified = await post('/auth/otp/verify', { email, otp });
log('Verify', verified);
if (verified.status !== 200) {
  process.exit(1);
}

const resendBlocked = await post('/auth/otp/resend', { email });
log('Resend after verified (expect 400)', resendBlocked);

console.log('\nSmoke OTP flow OK');
process.exit(0);
