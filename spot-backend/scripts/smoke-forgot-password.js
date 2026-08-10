/**
 * Smoke: register → role → verify → forgot-password → reset-password → login.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const email = domain
  ? `${local}+forgot${stamp}@${domain}`
  : `forgot_${stamp}@example.com`;
const phoneNumber = `09${String(stamp).slice(-8)}`;
const password = 'Password1';
const newPassword = 'NewPass2';

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

function log(step, data) {
  console.log(`\n=== ${step} ===`);
  console.log(JSON.stringify(data, null, 2));
}

const registered = await post('/auth/register', {
  fullName: 'Forgot Smoke',
  email,
  phoneNumber,
  gender: 'male',
  password,
  confirmPassword: password,
});
log('Register', {
  status: registered.status,
  email: registered.json.email,
});
if (registered.status !== 201) process.exit(1);

const registerOtp = registered.json.debugOtp;
if (!registerOtp) {
  console.error('Set OTP_DEBUG=true for smoke forgot-password.');
  process.exit(1);
}

const role = await post('/auth/role', { email, role: 'PLAYER' });
log('Select role', { status: role.status });
if (role.status !== 200) process.exit(1);

const verified = await post('/auth/otp/verify', {
  email,
  otp: registerOtp,
});
log('Verify register OTP', { status: verified.status });
if (verified.status !== 200) process.exit(1);

const unknown = await post('/auth/forgot-password', {
  email: `missing_${stamp}@example.com`,
});
log('Forgot unknown email', unknown);
if (unknown.status !== 200) process.exit(1);
if (unknown.json.debugOtp) {
  console.error('Unknown email must not return debugOtp');
  process.exit(1);
}

const forgot = await post('/auth/forgot-password', { email });
log('Forgot password', {
  status: forgot.status,
  hasDebugOtp: Boolean(forgot.json.debugOtp),
});
if (forgot.status !== 200) process.exit(1);

const resetOtp = forgot.json.debugOtp;
if (!resetOtp) {
  console.error('Set OTP_DEBUG=true for smoke forgot-password.');
  process.exit(1);
}

const badOtp = await post('/auth/reset-password', {
  email,
  otp: '000000',
  newPassword,
  confirmPassword: newPassword,
});
log('Reset bad OTP', badOtp);
if (badOtp.status !== 400) process.exit(1);

const reset = await post('/auth/reset-password', {
  email,
  otp: resetOtp,
  newPassword,
  confirmPassword: newPassword,
});
log('Reset password', reset);
if (reset.status !== 200) process.exit(1);

const oldLogin = await post('/auth/login', { email, password });
log('Login old password', { status: oldLogin.status });
if (oldLogin.status !== 401) process.exit(1);

const ok = await post('/auth/login', { email, password: newPassword });
log('Login new password', {
  status: ok.status,
  hasAccess: Boolean(ok.json.accessToken),
});
if (ok.status !== 200) process.exit(1);

console.log('\nSmoke forgot-password OK');
