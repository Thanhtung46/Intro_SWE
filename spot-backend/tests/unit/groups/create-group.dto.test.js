import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGroupSchema } from '../../../src/domains/groups/dto/create-group.dto.js';

function footballPayload(overrides = {}) {
  return {
    sport: 'FOOTBALL',
    name: 'Unity FC',
    title: 'Friendly 7v7 every weekend',
    description: 'Casual group',
    joinMode: 'APPROVAL',
    skillMin: 'REC_BASIC',
    skillMax: 'SEMI_PRO',
    venueName: 'San ABC',
    venueAddress: '123 Nguyen Van Linh, Q7, TP.HCM',
    province: '79',
    city: '778',
    courts: [{ name: 'Court A' }],
    recurringSlots: [
      {
        dayOfWeek: 6,
        startsAt: '18:00',
        durationMinutes: 120,
        courtName: 'Court A',
      },
    ],
    ...overrides,
  };
}

describe('createGroupSchema', () => {
  it('accepts football group with recurring slot', () => {
    const parsed = createGroupSchema.parse(footballPayload());
    assert.equal(parsed.name, 'Unity FC');
    assert.equal(parsed.joinMode, 'APPROVAL');
    assert.equal(parsed.recurringSlots[0].startsAt, '18:00:00');
  });

  it('rejects overlapping slots on same court and day', () => {
    assert.throws(() =>
      createGroupSchema.parse(
        footballPayload({
          recurringSlots: [
            {
              dayOfWeek: 6,
              startsAt: '18:00',
              durationMinutes: 90,
              courtName: 'Court A',
            },
            {
              dayOfWeek: 6,
              startsAt: '19:00',
              durationMinutes: 60,
              courtName: 'Court A',
            },
          ],
        }),
      ),
    );
  });

  it('rejects courtName not in courts[]', () => {
    assert.throws(() =>
      createGroupSchema.parse(
        footballPayload({
          recurringSlots: [
            {
              dayOfWeek: 6,
              startsAt: '18:00',
              durationMinutes: 60,
              courtName: 'Court B',
            },
          ],
        }),
      ),
    );
  });

  it('rejects startsAt not on 30-minute boundary', () => {
    assert.throws(() =>
      createGroupSchema.parse(
        footballPayload({
          recurringSlots: [
            {
              dayOfWeek: 6,
              startsAt: '18:15',
              durationMinutes: 60,
              courtName: 'Court A',
            },
          ],
        }),
      ),
    );
  });
});
