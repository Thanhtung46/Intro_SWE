import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCreateRefereeReviewDto } from '../../src/domains/review/dto/create-referee-review.dto.js';

test('parseCreateRefereeReviewDto accepts half-step rating', () => {
  const dto = parseCreateRefereeReviewDto({
    bookingId: 42,
    rating: 4.5,
  });
  assert.equal(dto.bookingId, 42);
  assert.equal(dto.rating, 4.5);
});

test('parseCreateRefereeReviewDto rejects non-half-step rating', () => {
  assert.throws(() =>
    parseCreateRefereeReviewDto({ bookingId: 1, rating: 4.3 }),
  );
});

test('parseCreateRefereeReviewDto rejects rating below 0.5', () => {
  assert.throws(() =>
    parseCreateRefereeReviewDto({ bookingId: 1, rating: 0 }),
  );
});

test('parseCreateRefereeReviewDto rejects reviewText field', () => {
  assert.throws(() =>
    parseCreateRefereeReviewDto({
      bookingId: 1,
      rating: 5,
      reviewText: 'not allowed',
    }),
  );
});
