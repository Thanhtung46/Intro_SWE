import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JOIN_REQUEST_STATUSES } from '../../../src/shared/constants/matchmaking.js';

/** Product lock: statuses that hide a kèo from GET /matches homepage browse. */
const BROWSE_HIDDEN_JOIN_STATUSES = Object.freeze([
  JOIN_REQUEST_STATUSES.PENDING,
  JOIN_REQUEST_STATUSES.ACCEPTED,
  JOIN_REQUEST_STATUSES.KICKED,
]);

describe('homepage browse join-request exclusion', () => {
  it('hides pending, accepted, and kicked — not rejected', () => {
    assert.deepEqual(BROWSE_HIDDEN_JOIN_STATUSES, [
      'PENDING',
      'ACCEPTED',
      'KICKED',
    ]);
    assert.ok(!BROWSE_HIDDEN_JOIN_STATUSES.includes(JOIN_REQUEST_STATUSES.REJECTED));
  });
});
