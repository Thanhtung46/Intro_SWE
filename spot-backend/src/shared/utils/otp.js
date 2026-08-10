import crypto from 'crypto';
import argon2 from 'argon2';

export function generateOtpCode(length = 6) {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
}

export async function hashOtpCode(code) {
  return argon2.hash(code, { type: argon2.argon2id });
}

export async function verifyOtpCode(hash, code) {
  return argon2.verify(hash, code);
}
