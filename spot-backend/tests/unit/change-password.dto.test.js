import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ZodError } from 'zod';
import { changePasswordSchema } from '../../src/domains/users/dto/change-password.dto.js';

describe('changePasswordSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = changePasswordSchema.parse({
      currentPassword: 'Password1!',
      newPassword: 'Password2!',
      confirmPassword: 'Password2!',
    });
    assert.equal(parsed.newPassword, 'Password2!');
  });

  it('rejects mismatched confirm password', () => {
    assert.throws(
      () =>
        changePasswordSchema.parse({
          currentPassword: 'Password1!',
          newPassword: 'Password2!',
          confirmPassword: 'Password3!',
        }),
      ZodError,
    );
  });

  it('rejects when new password equals current', () => {
    assert.throws(
      () =>
        changePasswordSchema.parse({
          currentPassword: 'Password1!',
          newPassword: 'Password1!',
          confirmPassword: 'Password1!',
        }),
      ZodError,
    );
  });

  it('rejects weak new password', () => {
    assert.throws(
      () =>
        changePasswordSchema.parse({
          currentPassword: 'Password1!',
          newPassword: 'weak',
          confirmPassword: 'weak',
        }),
      ZodError,
    );
  });
});
