import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { userIdParamSchema } from '../../../src/domains/auth/dto/user-id.dto.js';

describe('userIdParamSchema', () => {
  it('accepts a numeric string', () => {
    const parsed = userIdParamSchema.parse({ id: '12' });
    assert.equal(parsed.id, 12);
  });

  it('accepts an integer', () => {
    const parsed = userIdParamSchema.parse({ id: 7 });
    assert.equal(parsed.id, 7);
  });

  it('rejects zero', () => {
    const result = userIdParamSchema.safeParse({ id: '0' });
    assert.equal(result.success, false);
  });

  it('rejects a non-numeric id', () => {
    const result = userIdParamSchema.safeParse({ id: 'abc' });
    assert.equal(result.success, false);
  });

  it('rejects an id above Postgres INTEGER max', () => {
    const result = userIdParamSchema.safeParse({ id: '2147483648' });
    assert.equal(result.success, false);
  });
});
