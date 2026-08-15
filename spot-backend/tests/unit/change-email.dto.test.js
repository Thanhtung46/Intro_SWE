import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  requestEmailChangeSchema,
  confirmEmailChangeSchema,
} from '../../src/domains/users/dto/change-email.dto.js';

describe('requestEmailChangeSchema', () => {
  it('accepts a valid newEmail', () => {
    const parsed = requestEmailChangeSchema.parse({
      newEmail: 'new@example.com',
    });
    assert.equal(parsed.newEmail, 'new@example.com');
  });

  it('rejects invalid email', () => {
    const result = requestEmailChangeSchema.safeParse({
      newEmail: 'not-an-email',
    });
    assert.equal(result.success, false);
  });
});

describe('confirmEmailChangeSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = confirmEmailChangeSchema.parse({
      newEmail: 'new@example.com',
      otp: '123456',
    });
    assert.equal(parsed.otp, '123456');
  });

  it('rejects non-digit OTP', () => {
    const result = confirmEmailChangeSchema.safeParse({
      newEmail: 'new@example.com',
      otp: '12ab56',
    });
    assert.equal(result.success, false);
  });
});
