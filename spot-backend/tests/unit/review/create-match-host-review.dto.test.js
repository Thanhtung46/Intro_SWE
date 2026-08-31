import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMatchHostReviewSchema } from '../../../src/domains/review/dto/create-match-host-review.dto.js';

describe('createMatchHostReviewSchema', () => {
  it('accepts rating only', () => {
    const parsed = createMatchHostReviewSchema.parse({ rating: 5 });
    assert.equal(parsed.rating, 5);
    assert.equal(parsed.reviewText, undefined);
  });

  it('accepts rating and reviewText', () => {
    const parsed = createMatchHostReviewSchema.parse({
      rating: 4,
      reviewText: 'Great host',
    });
    assert.equal(parsed.reviewText, 'Great host');
  });

  it('rejects invalid rating', () => {
    assert.throws(() => createMatchHostReviewSchema.parse({ rating: 0 }));
  });
});
