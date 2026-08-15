import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  listScheduleSchema,
  seedScheduleSchema,
} from '../../src/domains/users/dto/schedule.dto.js';
import {
  todayInBangkok,
  addCalendarDays,
  bangkokRangeToUtc,
} from '../../src/domains/booking/service/booking.service.js';

describe('listScheduleSchema', () => {
  it('applies defaults', () => {
    const parsed = listScheduleSchema.parse({});
    assert.equal(parsed.type, 'all');
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.from, undefined);
    assert.equal(parsed.to, undefined);
  });

  it('parses type and dates', () => {
    const parsed = listScheduleSchema.parse({
      type: 'booking',
      from: '2026-08-01',
      to: '2026-08-31',
      limit: '20',
    });
    assert.equal(parsed.type, 'booking');
    assert.equal(parsed.from, '2026-08-01');
    assert.equal(parsed.to, '2026-08-31');
    assert.equal(parsed.limit, 20);
  });

  it('rejects from after to', () => {
    const result = listScheduleSchema.safeParse({
      from: '2026-08-20',
      to: '2026-08-10',
    });
    assert.equal(result.success, false);
  });

  it('rejects invalid type', () => {
    const result = listScheduleSchema.safeParse({ type: 'tournament' });
    assert.equal(result.success, false);
  });
});

describe('seedScheduleSchema', () => {
  it('applies defaults', () => {
    const parsed = seedScheduleSchema.parse({});
    assert.equal(parsed.includeMatch, true);
    assert.equal(parsed.daysFromNow, 3);
  });

  it('rejects unknown keys', () => {
    const result = seedScheduleSchema.safeParse({ extra: true });
    assert.equal(result.success, false);
  });
});

describe('bangkok date helpers', () => {
  it('formats today as YYYY-MM-DD', () => {
    const today = todayInBangkok(new Date('2026-08-15T20:00:00+07:00'));
    assert.equal(today, '2026-08-15');
  });

  it('adds calendar days', () => {
    assert.equal(addCalendarDays('2026-08-15', 30), '2026-09-14');
  });

  it('maps Bangkok day window to UTC half-open range', () => {
    const { rangeStart, rangeEnd } = bangkokRangeToUtc('2026-08-20', '2026-08-20');
    assert.equal(rangeStart.toISOString(), '2026-08-19T17:00:00.000Z');
    assert.equal(rangeEnd.toISOString(), '2026-08-20T17:00:00.000Z');
  });
});
