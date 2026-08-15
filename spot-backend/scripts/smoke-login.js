/**
 * Smoke: register → (debug OTP) verify → login → decode JWT claims.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';
import { verifyToken } from '../src/shared/utils/jwt.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const email = domain
  ? `${local}+login${stamp}@${domain}`
  : `login_${stamp}@example.com`;
const phoneNumber = `08${String(stamp).slice(-8)}`;
const password = 'Password1!';

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
  fullName: 'Login Smoke',
  email,
  phoneNumber,
  gender: 'male',
  password,
  confirmPassword: password,
});
log('Register', {
  status: registered.status,
  email: registered.json.email,
  nextStep: registered.json.nextStep,
});
if (registered.status !== 201) process.exit(1);

const otp = registered.json.debugOtp;
if (!otp) {
  console.error('Set OTP_DEBUG=true for smoke login.');
  process.exit(1);
}

const role = await post('/auth/role', { email, role: 'PLAYER' });
log('Select role', {
  status: role.status,
  role: role.json.user?.role,
  roleSelected: role.json.user?.roleSelected,
  nextStep: role.json.nextStep,
});
if (role.status !== 200) process.exit(1);

const verified = await post('/auth/otp/verify', { email, otp });
log('Verify', verified);
if (verified.status !== 200) process.exit(1);

const bad = await post('/auth/login', { email, password: 'WrongPass1' });
log('Login bad password', bad);
if (bad.status !== 401) process.exit(1);

const ok = await post('/auth/login', { email, password });
log('Login', {
  status: ok.status,
  role: ok.json.user?.role,
  hasAccess: Boolean(ok.json.accessToken),
  hasRefresh: Boolean(ok.json.refreshToken),
  expiresIn: ok.json.expiresIn,
});
if (ok.status !== 200) process.exit(1);

const access = verifyToken(ok.json.accessToken);
const refresh = verifyToken(ok.json.refreshToken);
log('JWT claims', {
  access: { sub: access.sub, role: access.role, type: access.type },
  refresh: { sub: refresh.sub, role: refresh.role, type: refresh.type },
});

if (access.type !== 'access' || refresh.type !== 'refresh') process.exit(1);
if (access.role !== 'PLAYER') process.exit(1);

async function get(path, token) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

const noAuth = await get('/auth/me');
log('GET /auth/me without token', noAuth);
if (noAuth.status !== 401) process.exit(1);

const me = await get('/auth/me', ok.json.accessToken);
log('GET /auth/me', {
  status: me.status,
  email: me.json.user?.email,
  role: me.json.user?.role,
});
if (me.status !== 200 || me.json.user?.email !== email) process.exit(1);

const withAccessAsRefresh = await post('/auth/refresh', {
  refreshToken: ok.json.accessToken,
});
log('Refresh with access token (expect 401)', {
  status: withAccessAsRefresh.status,
});
if (withAccessAsRefresh.status !== 401) process.exit(1);

const refreshed = await post('/auth/refresh', {
  refreshToken: ok.json.refreshToken,
});
log('Refresh', {
  status: refreshed.status,
  hasAccess: Boolean(refreshed.json.accessToken),
  hasRefresh: Boolean(refreshed.json.refreshToken),
  expiresIn: refreshed.json.expiresIn,
});
if (refreshed.status !== 200) process.exit(1);

const me2 = await get('/auth/me', refreshed.json.accessToken);
log('GET /auth/me after refresh', {
  status: me2.status,
  email: me2.json.user?.email,
});
if (me2.status !== 200) process.exit(1);

console.log('\nSmoke login OK');
