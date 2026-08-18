import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBookingBulkSchema } from '../../src/domains/booking/dto/create-booking-bulk.dto.js';

function futureDateString(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

describe('createBookingBulkSchema', () => {
  it('accepts multiple valid bookings across different fields/times', () => {
    const date = futureDateString(7);
    const parsed = createBookingBulkSchema.parse({
      bookings: [
        { fieldId: 1, bookingDate: date, startTime: '10:00', endTime: '11:00' },
        { fieldId: 2, bookingDate: date, startTime: '14:00', endTime: '15:00' },
      ],
    });
    assert.equal(parsed.bookings.length, 2);
  });

  it('rejects an empty bookings array', () => {
    const result = createBookingBulkSchema.safeParse({ bookings: [] });
    assert.equal(result.success, false);
  });

  it('rejects missing bookings field', () => {
    const result = createBookingBulkSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('rejects more than the max allowed bookings', () => {
    const date = futureDateString(7);
    const bookings = Array.from({ length: 21 }, (_, i) => ({
      fieldId: i + 1,
      bookingDate: date,
      startTime: '10:00',
      endTime: '11:00',
    }));
    const result = createBookingBulkSchema.safeParse({ bookings });
    assert.equal(result.success, false);
  });

  it('rejects if any single item is invalid (past date)', () => {
    const result = createBookingBulkSchema.safeParse({
      bookings: [{ fieldId: 1, bookingDate: '2020-01-01', startTime: '10:00', endTime: '11:00' }],
    });
    assert.equal(result.success, false);
  });
});
