/**
 * Smoke: register → role → verify → login → profile GET/PATCH + email/phone OTP change.
 */
import '../src/shared/config/env.js';
import config from '../src/shared/config/env.js';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const [local, domain] = String(config.smtp.user || 'dev@example.com').split('@');
const email = domain
  ? `${local}+profile${stamp}@${domain}`
  : `profile_${stamp}@example.com`;
const newEmail = domain
  ? `${local}+profileNew${stamp}@${domain}`
  : `profile_new_${stamp}@example.com`;
const phoneNumber = `08${String(stamp).slice(-8)}`;
const newPhone = `09${String(stamp).slice(-8)}`;
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
    fullName: 'Profile Smoke',
    email,
    phoneNumber,
    gender: 'male',
    password,
    confirmPassword: password,
  },
});
log('Register', { status: registered.status, email: registered.json.email });
if (registered.status !== 201) process.exit(1);

const otp = registered.json.debugOtp;
if (!otp) {
  console.error('Set OTP_DEBUG=true for smoke profile.');
  process.exit(1);
}

const role = await request('POST', '/auth/role', {
  body: { email, role: 'PLAYER' },
});
if (role.status !== 200) process.exit(1);

const verified = await request('POST', '/auth/otp/verify', {
  body: { email, otp },
});
if (verified.status !== 200) process.exit(1);

const login = await request('POST', '/auth/login', {
  body: { email, password },
});
log('Login', { status: login.status, hasAccess: Boolean(login.json.accessToken) });
if (login.status !== 200) process.exit(1);
const token = login.json.accessToken;

const authMe = await request('GET', '/auth/me', { token });
const usersMe = await request('GET', '/users/me', { token });
log('GET me', {
  auth: { status: authMe.status, email: authMe.json.user?.email },
  users: { status: usersMe.status, email: usersMe.json.user?.email },
});
if (authMe.status !== 200 || usersMe.status !== 200) process.exit(1);
if (authMe.json.user?.email !== usersMe.json.user?.email) process.exit(1);

const patched = await request('PATCH', '/users/me', {
  token,
  body: { fullName: 'Profile Updated', gender: 'female' },
});
log('PATCH /users/me', {
  status: patched.status,
  fullName: patched.json.user?.fullName,
  gender: patched.json.user?.gender,
});
if (patched.status !== 200) process.exit(1);
if (patched.json.user?.fullName !== 'Profile Updated') process.exit(1);
if (patched.json.user?.gender !== 'female') process.exit(1);

const prefs = await request('PATCH', '/users/me', {
  token,
  body: {
    language: 'vi',
    appearance: 'dark',
    pushNotificationsEnabled: false,
    locationServicesEnabled: false,
    avatarUrl: 'https://cdn.example.com/avatar.png',
  },
});
log('PATCH prefs', {
  status: prefs.status,
  language: prefs.json.user?.language,
  appearance: prefs.json.user?.appearance,
  push: prefs.json.user?.pushNotificationsEnabled,
  location: prefs.json.user?.locationServicesEnabled,
  avatarUrl: prefs.json.user?.avatarUrl,
});
if (prefs.status !== 200) process.exit(1);
if (prefs.json.user?.language !== 'vi') process.exit(1);
if (prefs.json.user?.appearance !== 'dark') process.exit(1);
if (prefs.json.user?.pushNotificationsEnabled !== false) process.exit(1);
if (prefs.json.user?.locationServicesEnabled !== false) process.exit(1);
if (prefs.json.user?.avatarUrl !== 'https://cdn.example.com/avatar.png') {
  process.exit(1);
}

const clearAvatar = await request('PATCH', '/users/me', {
  token,
  body: { avatarUrl: null },
});
log('Clear avatarUrl', {
  status: clearAvatar.status,
  avatarUrl: clearAvatar.json.user?.avatarUrl,
});
if (clearAvatar.status !== 200) process.exit(1);
if (clearAvatar.json.user?.avatarUrl !== null) process.exit(1);

const prefsGet = await request('GET', '/users/me/preferences', { token });
log('GET preferences', {
  status: prefsGet.status,
  preferences: prefsGet.json.preferences,
});
if (prefsGet.status !== 200) process.exit(1);
if (prefsGet.json.preferences?.language !== 'vi') process.exit(1);
if (prefsGet.json.preferences?.appearance !== 'dark') process.exit(1);

const prefsPatch = await request('PATCH', '/users/me/preferences', {
  token,
  body: {
    language: 'en',
    appearance: 'system',
    pushNotificationsEnabled: true,
    locationServicesEnabled: false,
  },
});
log('PATCH preferences', {
  status: prefsPatch.status,
  preferences: prefsPatch.json.preferences,
});
if (prefsPatch.status !== 200) process.exit(1);
if (prefsPatch.json.preferences?.language !== 'en') process.exit(1);
if (prefsPatch.json.preferences?.appearance !== 'system') process.exit(1);
if (prefsPatch.json.preferences?.pushNotificationsEnabled !== true) process.exit(1);
if (prefsPatch.json.preferences?.locationServicesEnabled !== false) process.exit(1);

const prefsSync = await request('GET', '/users/me/preferences', { token });
if (prefsSync.status !== 200) process.exit(1);
if (prefsSync.json.preferences?.appearance !== 'system') process.exit(1);

const rejectSensitive = await request('PATCH', '/users/me', {
  token,
  body: { email: newEmail },
});
log('PATCH with email (expect 400)', { status: rejectSensitive.status });
if (rejectSensitive.status !== 400) process.exit(1);

const emailReq = await request('POST', '/users/me/email/request', {
  token,
  body: { newEmail },
});
log('Email request', {
  status: emailReq.status,
  hasDebugOtp: Boolean(emailReq.json.debugOtp),
});
if (emailReq.status !== 200 || !emailReq.json.debugOtp) process.exit(1);

const emailConfirm = await request('POST', '/users/me/email/confirm', {
  token,
  body: { newEmail, otp: emailReq.json.debugOtp },
});
log('Email confirm', {
  status: emailConfirm.status,
  email: emailConfirm.json.user?.email,
});
if (emailConfirm.status !== 200) process.exit(1);
if (emailConfirm.json.user?.email !== newEmail.toLowerCase()) process.exit(1);

const phoneReq = await request('POST', '/users/me/phone/request', {
  token,
  body: { newPhone },
});
log('Phone request', {
  status: phoneReq.status,
  hasDebugOtp: Boolean(phoneReq.json.debugOtp),
});
if (phoneReq.status !== 200 || !phoneReq.json.debugOtp) process.exit(1);

const phoneConfirm = await request('POST', '/users/me/phone/confirm', {
  token,
  body: { newPhone, otp: phoneReq.json.debugOtp },
});
log('Phone confirm', {
  status: phoneConfirm.status,
  phone: phoneConfirm.json.user?.phoneNumber,
});
if (phoneConfirm.status !== 200) process.exit(1);
if (phoneConfirm.json.user?.phoneNumber !== newPhone) process.exit(1);

const meFinal = await request('GET', '/users/me', { token });
log('GET /users/me final', {
  status: meFinal.status,
  email: meFinal.json.user?.email,
  phone: meFinal.json.user?.phoneNumber,
  fullName: meFinal.json.user?.fullName,
  language: meFinal.json.user?.language,
  appearance: meFinal.json.user?.appearance,
});
if (meFinal.status !== 200) process.exit(1);
if (meFinal.json.user?.email !== newEmail.toLowerCase()) process.exit(1);
if (meFinal.json.user?.phoneNumber !== newPhone) process.exit(1);
if (meFinal.json.user?.language !== 'en') process.exit(1);
if (meFinal.json.user?.appearance !== 'system') process.exit(1);

const badPw = await request('POST', '/users/me/password', {
  token,
  body: {
    currentPassword: 'WrongPass1!',
    newPassword: 'Password2!',
    confirmPassword: 'Password2!',
  },
});
log('Change password wrong current (expect 400)', { status: badPw.status });
if (badPw.status !== 400) process.exit(1);

const newPassword = 'Password2!';
const changePw = await request('POST', '/users/me/password', {
  token,
  body: {
    currentPassword: password,
    newPassword,
    confirmPassword: newPassword,
  },
});
log('Change password', { status: changePw.status, message: changePw.json.message });
if (changePw.status !== 200) process.exit(1);

const loginOld = await request('POST', '/auth/login', {
  body: { email: newEmail, password },
});
log('Login with old password (expect fail)', { status: loginOld.status });
if (loginOld.status === 200) process.exit(1);

const loginNew = await request('POST', '/auth/login', {
  body: { email: newEmail, password: newPassword },
});
log('Login with new password', {
  status: loginNew.status,
  hasAccess: Boolean(loginNew.json.accessToken),
});
if (loginNew.status !== 200 || !loginNew.json.accessToken) process.exit(1);
const token2 = loginNew.json.accessToken;

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const form = new FormData();
form.append('avatar', new Blob([png], { type: 'image/png' }), 'avatar.png');
const avatarRes = await fetch(`${baseUrl}/users/me/avatar`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token2}` },
  body: form,
});
const avatarJson = await avatarRes.json();
log('Upload avatar', {
  status: avatarRes.status,
  avatarUrl: avatarJson.user?.avatarUrl,
});
if (avatarRes.status !== 200) process.exit(1);
if (!String(avatarJson.user?.avatarUrl || '').includes('/uploads/avatars/')) {
  process.exit(1);
}

const avatarGet = await fetch(avatarJson.user.avatarUrl);
log('Fetch uploaded avatar', { status: avatarGet.status });
if (avatarGet.status !== 200) process.exit(1);

console.log('\nSmoke profile OK');
