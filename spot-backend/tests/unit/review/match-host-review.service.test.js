import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isMatchReviewable } from '../../../src/domains/review/service/match-host-review.service.js';
import { MATCH_STATUSES } from '../../../src/shared/constants/matchmaking.js';

describe('isMatchReviewable', () => {
  const base = {
    status: MATCH_STATUSES.COMPLETED,
    ends_at: new Date(Date.now() - 60_000).toISOString(),
    filled_count: 10,
    max_players: 10,
  };

  it('returns true for ended full kèo', () => {
    assert.equal(isMatchReviewable(base), true);
  });

  it('returns false when cancelled', () => {
    assert.equal(
      isMatchReviewable({ ...base, status: MATCH_STATUSES.CANCELLED }),
      false,
    );
  });

  it('returns false when underfilled', () => {
    assert.equal(isMatchReviewable({ ...base, filled_count: 8 }), false);
  });

  it('returns false before endsAt', () => {
    assert.equal(
      isMatchReviewable({
        ...base,
        ends_at: new Date(Date.now() + 60_000).toISOString(),
      }),
      false,
    );
  });
});
