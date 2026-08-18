import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCreateMatchBulkDto } from '../../../src/domains/matchmaking/dto/create-match-bulk.dto.js';

const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
futureStart.setMinutes(0, 0, 0);
const futureEnd = new Date(futureStart.getTime() + 2 * 60 * 60 * 1000);
const secondStart = new Date(futureStart.getTime() + 7 * 24 * 60 * 60 * 1000);
const secondEnd = new Date(secondStart.getTime() + 2 * 60 * 60 * 1000);

function baseTemplate(overrides = {}) {
  return {
    sport: 'FOOTBALL',
    format: 'SEVEN_A_SIDE',
    title: 'Saturday 7v7',
    venueName: 'San ABC',
    venueAddress: '123 Nguyen Van Linh, Q7',
    province: '79',
    city: '778',
    maxPlayers: 14,
    allLevels: true,
    feeType: 'SPLIT_EVENLY',
    priceMin: 1400000,
    joinMode: 'AUTO',
    courts: [{ name: '1' }],
    isRecurring: false,
    ...overrides,
  };
}

describe('createMatchBulkSchema', () => {
  it('accepts one schedule', () => {
    const result = parseCreateMatchBulkDto({
      template: baseTemplate(),
      schedules: [
        { startsAt: futureStart.toISOString(), endsAt: futureEnd.toISOString() },
      ],
    });
    assert.equal(result.schedules.length, 1);
    assert.equal(result.template.isMultiDay, false);
  });

  it('accepts multiple schedules', () => {
    const result = parseCreateMatchBulkDto({
      template: baseTemplate({ isRecurring: true }),
      schedules: [
        { startsAt: futureStart.toISOString(), endsAt: futureEnd.toISOString() },
        { startsAt: secondStart.toISOString(), endsAt: secondEnd.toISOString() },
      ],
    });
    assert.equal(result.schedules.length, 2);
  });

  it('rejects empty schedules', () => {
    assert.throws(
      () =>
        parseCreateMatchBulkDto({
          template: baseTemplate(),
          schedules: [],
        }),
      /At least one schedule/,
    );
  });

  it('rejects duration shorter than one hour', () => {
    const shortEnd = new Date(futureStart.getTime() + 30 * 60 * 1000);
    assert.throws(
      () =>
        parseCreateMatchBulkDto({
          template: baseTemplate(),
          schedules: [
            { startsAt: futureStart.toISOString(), endsAt: shortEnd.toISOString() },
          ],
        }),
      /at least 60 minutes/i,
    );
  });
});
