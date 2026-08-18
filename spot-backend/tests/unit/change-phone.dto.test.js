import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  requestPhoneChangeSchema,
  confirmPhoneChangeSchema,
} from '../../src/domains/users/dto/change-phone.dto.js';

describe('requestPhoneChangeSchema', () => {
  it('accepts a valid Vietnamese phone', () => {
    const parsed = requestPhoneChangeSchema.parse({
      newPhone: '0901234567',
    });
    assert.equal(parsed.newPhone, '0901234567');
  });

  it('rejects invalid phone', () => {
    const result = requestPhoneChangeSchema.safeParse({
      newPhone: '12345',
    });
    assert.equal(result.success, false);
  });
});

describe('confirmPhoneChangeSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = confirmPhoneChangeSchema.parse({
      newPhone: '0901234567',
      otp: '654321',
    });
    assert.equal(parsed.otp, '654321');
  });

  it('rejects short OTP', () => {
    const result = confirmPhoneChangeSchema.safeParse({
      newPhone: '0901234567',
      otp: '123',
    });
    assert.equal(result.success, false);
  });
});
