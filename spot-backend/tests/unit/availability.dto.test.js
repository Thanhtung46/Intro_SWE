import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fieldAvailabilityQuerySchema } from '../../src/domains/booking/dto/availability.dto.js';

function futureDateString(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

describe('fieldAvailabilityQuerySchema', () => {
  it('accepts a valid future date', () => {
    const date = futureDateString(7);
    const parsed = fieldAvailabilityQuerySchema.parse({ date });
    assert.equal(parsed.date, date);
  });

  it('rejects missing date', () => {
    const result = fieldAvailabilityQuerySchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('rejects malformed date', () => {
    const result = fieldAvailabilityQuerySchema.safeParse({ date: '20-08-2026' });
    assert.equal(result.success, false);
  });

  it('rejects a past date', () => {
    const result = fieldAvailabilityQuerySchema.safeParse({ date: '2020-01-01' });
    assert.equal(result.success, false);
  });
});
