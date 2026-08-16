import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../../src/domains/auth/dto/forgot-password.dto.js';

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    const parsed = forgotPasswordSchema.parse({
      email: 'player@example.com',
    });
    assert.equal(parsed.email, 'player@example.com');
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'not-an-email',
    });
    assert.equal(result.success, false);
  });

  it('rejects missing email', () => {
    const result = forgotPasswordSchema.safeParse({});
    assert.equal(result.success, false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = resetPasswordSchema.parse({
      email: 'player@example.com',
      otp: '123456',
      newPassword: 'Password1!',
      confirmPassword: 'Password1!',
    });
    assert.equal(parsed.otp, '123456');
    assert.equal(parsed.newPassword, 'Password1!');
  });

  it('rejects non-digit OTP', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'player@example.com',
      otp: '12ab56',
      newPassword: 'Password1!',
      confirmPassword: 'Password1!',
    });
    assert.equal(result.success, false);
  });

  it('rejects weak password', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'player@example.com',
      otp: '123456',
      newPassword: 'password',
      confirmPassword: 'password',
    });
    assert.equal(result.success, false);
  });

  it('rejects password without special character', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'player@example.com',
      otp: '123456',
      newPassword: 'Password1',
      confirmPassword: 'Password1',
    });
    assert.equal(result.success, false);
  });

  it('rejects mismatched confirm password', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'player@example.com',
      otp: '123456',
      newPassword: 'Password1!',
      confirmPassword: 'Password2!',
    });
    assert.equal(result.success, false);
  });
});
