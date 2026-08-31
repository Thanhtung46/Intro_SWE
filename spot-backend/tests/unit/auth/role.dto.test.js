import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { selectRoleSchema } from '../../../src/domains/auth/dto/role.dto.js';

describe('selectRoleSchema', () => {
  it('accepts PLAYER', () => {
    const parsed = selectRoleSchema.parse({
      email: 'player@example.com',
      role: 'PLAYER',
    });
    assert.equal(parsed.role, 'PLAYER');
  });

  it('accepts OWNER (Venue Owner)', () => {
    const parsed = selectRoleSchema.parse({
      email: 'owner@example.com',
      role: 'OWNER',
    });
    assert.equal(parsed.role, 'OWNER');
  });

  it('accepts REFEREE', () => {
    const parsed = selectRoleSchema.parse({
      email: 'ref@example.com',
      role: 'REFEREE',
    });
    assert.equal(parsed.role, 'REFEREE');
  });

  it('rejects ADMIN', () => {
    const result = selectRoleSchema.safeParse({
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    assert.equal(result.success, false);
  });

  it('rejects missing role', () => {
    const result = selectRoleSchema.safeParse({
      email: 'player@example.com',
    });
    assert.equal(result.success, false);
  });
});
