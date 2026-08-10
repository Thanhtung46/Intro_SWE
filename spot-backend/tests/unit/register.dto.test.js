import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema } from '../../src/domains/auth/dto/register.dto.js';

const valid = {
  fullName: 'Nguyen Van A',
  email: 'player@example.com',
  phoneNumber: '0901234567',
  gender: 'male',
  password: 'Password1',
  confirmPassword: 'Password1',
};

describe('registerSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = registerSchema.parse(valid);
    assert.equal(parsed.email, 'player@example.com');
    assert.equal(parsed.phoneNumber, '0901234567');
  });

  it('rejects missing phone', () => {
    const result = registerSchema.safeParse({ ...valid, phoneNumber: undefined });
    assert.equal(result.success, false);
  });

  it('rejects weak password', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'password',
      confirmPassword: 'password',
    });
    assert.equal(result.success, false);
  });

  it('rejects password shorter than 8', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'Pass1',
      confirmPassword: 'Pass1',
    });
    assert.equal(result.success, false);
  });

  it('rejects password confirmation mismatch', () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: 'Password2',
    });
    assert.equal(result.success, false);
    assert.ok(
      result.error.errors.some((e) => e.path.includes('confirmPassword')),
    );
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      ...valid,
      email: 'not-an-email',
    });
    assert.equal(result.success, false);
  });

  it('rejects invalid gender', () => {
    const result = registerSchema.safeParse({
      ...valid,
      gender: 'unknown',
    });
    assert.equal(result.success, false);
  });
});
