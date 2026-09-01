/**
 * Smoke: pending owner → verification request → admin approve → owner login.
 * Requires: server up, migration 008 applied, OTP_DEBUG=true, seed-admin run.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@spot.local').toLowerCase();
const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'AdminPass1!';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const ownerEmail = domain
  ? `${local}+owner${stamp}@${domain}`
  : `owner_${stamp}@example.com`;
const ownerPhone = `09${String(stamp).slice(-8)}`;
const ownerPassword = 'Password1!';

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
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

async function get(path, token) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
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

async function patch(path, body, token) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
  fullName: 'Owner Smoke',
  email: ownerEmail,
  phoneNumber: ownerPhone,
  gender: 'male',
  password: ownerPassword,
  confirmPassword: ownerPassword,
});
log('Register owner', { status: registered.status, email: ownerEmail });
if (registered.status !== 201) process.exit(1);

const otp = registered.json.debugOtp;
if (!otp) {
  console.error('Set OTP_DEBUG=true for smoke admin approvals.');
  process.exit(1);
}

const role = await post('/auth/role', { email: ownerEmail, role: 'OWNER' });
log('Select OWNER role', {
  status: role.status,
  userStatus: role.json.user?.status,
});
if (role.status !== 200) process.exit(1);
if (role.json.user?.status !== 'PENDING') process.exit(1);

const verified = await post('/auth/otp/verify', { email: ownerEmail, otp });
log('Verify OTP', {
  status: verified.status,
  hasAccessToken: Boolean(verified.json.accessToken),
  nextStep: verified.json.nextStep,
});
if (verified.status !== 200) process.exit(1);

const pendingLogin = await post('/auth/login', {
  email: ownerEmail,
  password: ownerPassword,
});
log('Owner login while pending', { status: pendingLogin.status });
if (pendingLogin.status !== 403) process.exit(1);

const verifyReq = await post(
  '/users/me/verification-requests',
  {
    documentUrl: 'https://cdn.example.com/licenses/smoke-owner.pdf',
    requestType: 'OWNER_LICENSE',
  },
  verified.json.accessToken,
);
log('Submit verification request', {
  status: verifyReq.status,
  requestId: verifyReq.json.request?.verificationReqId,
});
if (verifyReq.status !== 201) process.exit(1);

const adminLogin = await post('/auth/login', {
  email: adminEmail,
  password: adminPassword,
});
log('Admin login', {
  status: adminLogin.status,
  role: adminLogin.json.user?.role,
});
if (adminLogin.status !== 200) {
  console.error('Run: node scripts/seed-admin.js');
  process.exit(1);
}
const adminToken = adminLogin.json.accessToken;

const approvals = await get('/admin/approvals?status=PENDING', adminToken);
log('List pending approvals', {
  status: approvals.status,
  total: approvals.json.total,
});
if (approvals.status !== 200) process.exit(1);
if (!approvals.json.items?.length) process.exit(1);

const reqId = verifyReq.json.request.verificationReqId;
const approve = await post(`/admin/approvals/${reqId}/approve`, {}, adminToken);
log('Approve request', {
  status: approve.status,
  requestStatus: approve.json.request?.status,
  applicantStatus: approve.json.request?.applicant?.status,
});
if (approve.status !== 200) process.exit(1);
if (approve.json.request?.status !== 'APPROVED') process.exit(1);

const ownerLogin = await post('/auth/login', {
  email: ownerEmail,
  password: ownerPassword,
});
log('Owner login after approval', { status: ownerLogin.status });
if (ownerLogin.status !== 200) process.exit(1);

const dashboard = await get('/admin/dashboard/summary', adminToken);
log('Dashboard summary', {
  status: dashboard.status,
  totalUsers: dashboard.json.summary?.totalUsers,
  revenueTotal: dashboard.json.summary?.revenueTotal,
});
if (dashboard.status !== 200) process.exit(1);

const settingsPatch = await patch(
  '/admin/settings',
  {
    commissionRatePercent: 12,
    paymentGateways: { momo: { enabled: true } },
  },
  adminToken,
);
log('Patch settings', {
  status: settingsPatch.status,
  commission: settingsPatch.json.settings?.commissionRatePercent,
  momo: settingsPatch.json.settings?.paymentGateways?.momo?.enabled,
});
if (settingsPatch.status !== 200) process.exit(1);

const suspend = await patch(
  `/admin/users/${ownerLogin.json.user.userId}`,
  { status: 'LOCKED' },
  adminToken,
);
log('Suspend owner', { status: suspend.status });
if (suspend.status !== 200) process.exit(1);

const lockedLogin = await post('/auth/login', {
  email: ownerEmail,
  password: ownerPassword,
});
log('Owner login while locked', { status: lockedLogin.status });
if (lockedLogin.status !== 403) process.exit(1);

console.log('\nAdmin approvals smoke OK');
