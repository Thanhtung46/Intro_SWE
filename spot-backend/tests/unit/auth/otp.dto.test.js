import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyOtpSchema,
  resendOtpSchema,
} from '../../../src/domains/auth/dto/otp.dto.js';

describe('verifyOtpSchema', () => {
  it('accepts a valid payload and defaults purpose', () => {
    const parsed = verifyOtpSchema.parse({
      email: 'player@example.com',
      otp: '123456',
    });
    assert.equal(parsed.email, 'player@example.com');
    assert.equal(parsed.otp, '123456');
    assert.equal(parsed.purpose, 'REGISTER');
  });

  it('rejects non-digit OTP', () => {
    const result = verifyOtpSchema.safeParse({
      email: 'player@example.com',
      otp: '12ab56',
    });
    assert.equal(result.success, false);
  });

  it('rejects OTP length other than 6', () => {
    const result = verifyOtpSchema.safeParse({
      email: 'player@example.com',
      otp: '12345',
    });
    assert.equal(result.success, false);
  });

  it('rejects invalid email', () => {
    const result = verifyOtpSchema.safeParse({
      email: 'not-an-email',
      otp: '123456',
    });
    assert.equal(result.success, false);
  });
});

describe('resendOtpSchema', () => {
  it('accepts email and defaults purpose', () => {
    const parsed = resendOtpSchema.parse({ email: 'player@example.com' });
    assert.equal(parsed.email, 'player@example.com');
    assert.equal(parsed.purpose, 'REGISTER');
  });

  it('accepts FORGOT_PASSWORD purpose', () => {
    const parsed = resendOtpSchema.parse({
      email: 'player@example.com',
      purpose: 'FORGOT_PASSWORD',
    });
    assert.equal(parsed.purpose, 'FORGOT_PASSWORD');
  });

  it('rejects missing email', () => {
    const result = resendOtpSchema.safeParse({});
    assert.equal(result.success, false);
  });
});
