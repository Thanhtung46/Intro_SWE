/**
 * Smoke: register → login → change password → verify SYSTEM inbox notification.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const email = domain
  ? `${local}+acct${stamp}@${domain}`
  : `acct_${stamp}@example.com`;
const phoneNumber = `08${String(stamp).slice(-8)}`;
const password = 'Password1!';
const newPassword = 'Password2!';

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

async function waitForSecurityNotification(token, action, { tries = 25 } = {}) {
  for (let i = 0; i < tries; i += 1) {
    const list = await request('GET', '/notifications', { token });
    const hit = list.json.items?.find(
      (item) => item.type === 'SYSTEM' && item.data?.action === action,
    );
    if (hit) return hit;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

const registered = await request('POST', '/auth/register', {
  body: {
    fullName: 'Account Notify Smoke',
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
  console.error('Set OTP_DEBUG=true for smoke account notify.');
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

const changePw = await request('POST', '/users/me/password', {
  token,
  body: {
    currentPassword: password,
    newPassword,
    confirmPassword: newPassword,
  },
});
log('Change password', { status: changePw.status });
if (changePw.status !== 200) process.exit(1);

const passwordNotif = await waitForSecurityNotification(
  token,
  'ACCOUNT_PASSWORD_CHANGED',
);
log('Password change notification', passwordNotif);
if (!passwordNotif) {
  console.error('Expected ACCOUNT_PASSWORD_CHANGED inbox row');
  process.exit(1);
}

const loginNew = await request('POST', '/auth/login', {
  body: { email, password: newPassword },
});
if (loginNew.status !== 200) process.exit(1);

const forgot = await request('POST', '/auth/forgot-password', { body: { email } });
log('Forgot password', {
  status: forgot.status,
  hasDebugOtp: Boolean(forgot.json.debugOtp),
});
if (forgot.status !== 200 || !forgot.json.debugOtp) process.exit(1);

const reset = await request('POST', '/auth/reset-password', {
  body: {
    email,
    otp: forgot.json.debugOtp,
    newPassword: password,
    confirmPassword: password,
  },
});
log('Reset password', { status: reset.status });
if (reset.status !== 200) process.exit(1);

const loginAfterReset = await request('POST', '/auth/login', {
  body: { email, password },
});
if (loginAfterReset.status !== 200) process.exit(1);
const tokenAfterReset = loginAfterReset.json.accessToken;

const resetNotif = await waitForSecurityNotification(
  tokenAfterReset,
  'ACCOUNT_PASSWORD_RESET',
);
log('Password reset notification', resetNotif);
if (!resetNotif) {
  console.error('Expected ACCOUNT_PASSWORD_RESET inbox row');
  process.exit(1);
}

console.log('\nSmoke account notify OK');
