import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { myJoinRequestsQuerySchema } from '../../../src/domains/matchmaking/dto/my-join-requests.dto.js';

describe('myJoinRequestsQuerySchema', () => {
  it('defaults limit and offset', () => {
    const parsed = myJoinRequestsQuerySchema.parse({});
    assert.equal(parsed.limit, 20);
    assert.equal(parsed.offset, 0);
  });

  it('accepts pagination', () => {
    const parsed = myJoinRequestsQuerySchema.parse({ limit: '10', offset: '5' });
    assert.equal(parsed.limit, 10);
    assert.equal(parsed.offset, 5);
  });

  it('accepts status filter', () => {
    const pending = myJoinRequestsQuerySchema.parse({ status: 'PENDING' });
    assert.equal(pending.status, 'PENDING');
    const rejected = myJoinRequestsQuerySchema.parse({ status: 'REJECTED' });
    assert.equal(rejected.status, 'REJECTED');
  });

  it('rejects invalid status', () => {
    assert.throws(() =>
      myJoinRequestsQuerySchema.parse({ status: 'ACCEPTED' }),
    );
  });
});
