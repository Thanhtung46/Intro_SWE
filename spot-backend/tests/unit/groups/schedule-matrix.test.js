import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScheduleMatrix,
  isoDayOfWeekBangkok,
} from '../../../src/shared/constants/groups.js';

describe('group schedule matrix', () => {
  it('isoDayOfWeekBangkok returns 7 for Sunday in Bangkok', () => {
    assert.equal(isoDayOfWeekBangkok('2026-08-23'), 7);
  });

  it('marks overlapping recurring slots as BOOKED', () => {
    const courts = [{ court_id: 1, name: 'Court A', sort_order: 0 }];
    const recurringSlots = [
      {
        court_id: 1,
        day_of_week: 7,
        start_time: '17:30:00',
        duration_minutes: 60,
      },
    ];

    const matrix = buildScheduleMatrix(courts, recurringSlots, 7);
    assert.equal(matrix.length, 1);
    const slots = matrix[0].slots;
    const at1700 = slots.find((slot) => slot.startsAt === '17:00');
    const at1730 = slots.find((slot) => slot.startsAt === '17:30');
    const at1800 = slots.find((slot) => slot.startsAt === '18:00');
    const at1830 = slots.find((slot) => slot.startsAt === '18:30');
    const at1900 = slots.find((slot) => slot.startsAt === '19:00');

    assert.equal(at1700.status, 'AVAILABLE');
    assert.equal(at1730.status, 'BOOKED');
    assert.equal(at1800.status, 'BOOKED');
    assert.equal(at1830.status, 'AVAILABLE');
    assert.equal(at1900.status, 'AVAILABLE');
  });
});
