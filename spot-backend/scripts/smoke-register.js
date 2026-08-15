const body = {
  fullName: 'Nguyen Van A',
  email: `player_smoke_${Date.now()}@example.com`,
  phoneNumber: `09${String(Date.now()).slice(-8)}`,
  gender: 'male',
  password: 'Password1!',
  confirmPassword: 'Password1!',
};

const res = await fetch('http://127.0.0.1:3000/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

console.log('request', body);
console.log('status', res.status);
console.log('response', await res.text());
