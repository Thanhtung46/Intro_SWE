import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { refreshSchema } from '../../src/domains/auth/dto/refresh.dto.js';

describe('refreshSchema', () => {
  it('accepts a valid refresh token string', () => {
    const parsed = refreshSchema.parse({
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    });
    assert.ok(parsed.refreshToken.length > 0);
  });

  it('rejects missing refreshToken', () => {
    const result = refreshSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('rejects empty refreshToken', () => {
    const result = refreshSchema.safeParse({ refreshToken: '   ' });
    assert.equal(result.success, false);
  });
});
