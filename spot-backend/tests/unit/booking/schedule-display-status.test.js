import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDisplayStatus } from '../../../src/domains/booking/entity/schedule.entity.js';
import { SCHEDULE_DISPLAY_STATUSES } from '../../../src/shared/constants/schedule.js';

describe('computeDisplayStatus', () => {
  const now = Date.parse('2026-10-21T12:00:00.000Z');
  const baseRow = {
    booking_status: 'PAID',
    starts_at: '2026-10-21T13:00:00.000Z',
    ends_at: '2026-10-21T14:00:00.000Z',
  };

  it('returns UPCOMING before the start time', () => {
    assert.equal(computeDisplayStatus(baseRow, now), SCHEDULE_DISPLAY_STATUSES.UPCOMING);
  });

  it('returns IN_PROGRESS between start and end time', () => {
    const row = { ...baseRow, starts_at: '2026-10-21T11:00:00.000Z' };
    assert.equal(computeDisplayStatus(row, now), SCHEDULE_DISPLAY_STATUSES.IN_PROGRESS);
  });

  it('returns COMPLETED once past end time even if status has not caught up yet', () => {
    const row = {
      ...baseRow,
      starts_at: '2026-10-21T09:00:00.000Z',
      ends_at: '2026-10-21T10:00:00.000Z',
    };
    assert.equal(computeDisplayStatus(row, now), SCHEDULE_DISPLAY_STATUSES.COMPLETED);
  });

  it('returns COMPLETED when status is already COMPLETED regardless of time', () => {
    const row = { ...baseRow, booking_status: 'COMPLETED', starts_at: '2026-10-22T09:00:00.000Z' };
    assert.equal(computeDisplayStatus(row, now), SCHEDULE_DISPLAY_STATUSES.COMPLETED);
  });

  it('returns CANCELLED for a NO_SHOW booking regardless of time', () => {
    const row = { ...baseRow, booking_status: 'NO_SHOW', starts_at: '2026-10-22T09:00:00.000Z' };
    assert.equal(computeDisplayStatus(row, now), SCHEDULE_DISPLAY_STATUSES.CANCELLED);
  });

  it('applies the same rules to a MATCH row (no booking-specific fields required)', () => {
    const row = { booking_status: 'OPEN', starts_at: '2026-10-21T13:00:00.000Z', ends_at: '2026-10-21T14:00:00.000Z' };
    assert.equal(computeDisplayStatus(row, now), SCHEDULE_DISPLAY_STATUSES.UPCOMING);
  });
});
