import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema } from '../../src/domains/auth/dto/login.dto.js';

describe('loginSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = loginSchema.parse({
      email: 'player@example.com',
      password: 'Password1',
    });
    assert.equal(parsed.email, 'player@example.com');
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'Password1',
    });
    assert.equal(result.success, false);
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({
      email: 'player@example.com',
    });
    assert.equal(result.success, false);
  });
});
