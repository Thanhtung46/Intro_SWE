import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBookingSchema } from '../../src/domains/booking/dto/create-booking.dto.js';

function futureDateString(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

describe('createBookingSchema', () => {
  it('accepts a valid future payload', () => {
    const parsed = createBookingSchema.parse({
      fieldId: 45,
      bookingDate: futureDateString(7),
      startTime: '19:00',
      endTime: '20:00',
    });
    assert.equal(parsed.fieldId, 45);
    assert.equal(parsed.startTime, '19:00');
    assert.equal(parsed.endTime, '20:00');
  });

  it('rejects endTime equal to startTime', () => {
    const result = createBookingSchema.safeParse({
      fieldId: 45,
      bookingDate: futureDateString(7),
      startTime: '19:00',
      endTime: '19:00',
    });
    assert.equal(result.success, false);
  });

  it('rejects endTime before startTime', () => {
    const result = createBookingSchema.safeParse({
      fieldId: 45,
      bookingDate: futureDateString(7),
      startTime: '20:00',
      endTime: '19:00',
    });
    assert.equal(result.success, false);
  });

  it('rejects a past bookingDate', () => {
    const result = createBookingSchema.safeParse({
      fieldId: 45,
      bookingDate: '2020-01-01',
      startTime: '19:00',
      endTime: '20:00',
    });
    assert.equal(result.success, false);
  });

  it('rejects missing fieldId', () => {
    const result = createBookingSchema.safeParse({
      bookingDate: futureDateString(7),
      startTime: '19:00',
      endTime: '20:00',
    });
    assert.equal(result.success, false);
  });

  it('rejects malformed startTime', () => {
    const result = createBookingSchema.safeParse({
      fieldId: 45,
      bookingDate: futureDateString(7),
      startTime: '7pm',
      endTime: '20:00',
    });
    assert.equal(result.success, false);
  });
});
