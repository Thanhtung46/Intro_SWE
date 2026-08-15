import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema } from '../../src/domains/auth/dto/register.dto.js';

const valid = {
  fullName: 'Nguyen Van A',
  email: 'player@example.com',
  phoneNumber: '0901234567',
  gender: 'male',
  password: 'Password1!',
  confirmPassword: 'Password1!',
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

  it('accepts landline prefix 02', () => {
    const parsed = registerSchema.parse({
      ...valid,
      phoneNumber: '0241234567',
    });
    assert.equal(parsed.phoneNumber, '0241234567');
  });

  it('rejects phone that is not exactly 10 digits', () => {
    const tooShort = registerSchema.safeParse({
      ...valid,
      phoneNumber: '090123456',
    });
    const tooLong = registerSchema.safeParse({
      ...valid,
      phoneNumber: '09012345678',
    });
    const withPlus = registerSchema.safeParse({
      ...valid,
      phoneNumber: '+84901234567',
    });
    assert.equal(tooShort.success, false);
    assert.equal(tooLong.success, false);
    assert.equal(withPlus.success, false);
  });

  it('rejects non-Vietnamese phone prefixes', () => {
    const randomDigits = registerSchema.safeParse({
      ...valid,
      phoneNumber: '1234567890',
    });
    const prefix01 = registerSchema.safeParse({
      ...valid,
      phoneNumber: '0123456789',
    });
    assert.equal(randomDigits.success, false);
    assert.equal(prefix01.success, false);
  });

  it('rejects weak password', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'password',
      confirmPassword: 'password',
    });
    assert.equal(result.success, false);
  });

  it('rejects password without special character', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    assert.equal(result.success, false);
  });

  it('rejects password shorter than 8', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'Pass1!',
      confirmPassword: 'Pass1!',
    });
    assert.equal(result.success, false);
  });

  it('rejects password confirmation mismatch', () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: 'Password2!',
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
