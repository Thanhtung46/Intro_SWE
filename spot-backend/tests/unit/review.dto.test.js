import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createReviewSchema,
  replyReviewSchema,
  reviewIdParamSchema,
} from '../../src/domains/review/dto/create-review.dto.js';

describe('createReviewSchema', () => {
  it('accepts valid payload', () => {
    const parsed = createReviewSchema.parse({
      bookingId: 1,
      rating: 5,
      reviewText: 'Great pitch',
    });
    assert.equal(parsed.bookingId, 1);
    assert.equal(parsed.rating, 5);
    assert.equal(parsed.reviewText, 'Great pitch');
  });

  it('trims empty reviewText to null', () => {
    const parsed = createReviewSchema.parse({
      bookingId: 2,
      rating: 4,
      reviewText: '   ',
    });
    assert.equal(parsed.reviewText, null);
  });

  it('rejects rating out of range', () => {
    const result = createReviewSchema.safeParse({ bookingId: 1, rating: 6 });
    assert.equal(result.success, false);
  });

  it('rejects spammy reviewText', () => {
    const result = createReviewSchema.safeParse({
      bookingId: 1,
      rating: 3,
      reviewText: 'aaaaaaaaaa',
    });
    assert.equal(result.success, false);
  });
});

describe('replyReviewSchema', () => {
  it('accepts reply text', () => {
    const parsed = replyReviewSchema.parse({ replyText: 'Thanks for playing!' });
    assert.equal(parsed.replyText, 'Thanks for playing!');
  });

  it('rejects empty reply', () => {
    const result = replyReviewSchema.safeParse({ replyText: '  ' });
    assert.equal(result.success, false);
  });
});

describe('reviewIdParamSchema', () => {
  it('parses id', () => {
    const parsed = reviewIdParamSchema.parse({ id: '9' });
    assert.equal(parsed.id, 9);
  });
});
