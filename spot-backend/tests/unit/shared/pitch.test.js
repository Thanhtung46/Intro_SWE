import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVenueName,
  normalizeVenueAddress,
  normalizeCourtName,
  pitchKey,
  timesOverlap,
} from '../../../src/shared/constants/matchmaking.js';

describe('pitch occupancy helpers', () => {
  it('normalizes venue spacing and case', () => {
    assert.equal(normalizeVenueName('  San   ABC, Q7 '), 'san abc, q7');
    assert.equal(normalizeVenueName('SAN ABC, Q7'), 'san abc, q7');
  });

  it('normalizes court names', () => {
    assert.equal(normalizeCourtName(' Court  1 '), 'court 1');
    assert.equal(normalizeCourtName('1'), '1');
  });

  it('builds a shared pitch key from name, address, and court', () => {
    assert.equal(
      pitchKey('San ABC', '123 Nguyen Van Linh, Q7', '1'),
      pitchKey('  san   abc', '  123   Nguyen Van Linh, Q7 ', ' 1 '),
    );
    assert.equal(
      normalizeVenueAddress('  123   Nguyen Van Linh, Q7 '),
      '123 nguyen van linh, q7',
    );
  });

  it('treats 09-11 and 10-12 as overlap', () => {
    const nine = new Date('2026-09-20T09:00:00+07:00');
    const eleven = new Date('2026-09-20T11:00:00+07:00');
    const ten = new Date('2026-09-20T10:00:00+07:00');
    const twelve = new Date('2026-09-20T12:00:00+07:00');
    assert.equal(timesOverlap(nine, eleven, ten, twelve), true);
  });

  it('treats 09-11 and 11-13 as adjacent, not overlapping', () => {
    const nine = new Date('2026-09-20T09:00:00+07:00');
    const eleven = new Date('2026-09-20T11:00:00+07:00');
    const thirteen = new Date('2026-09-20T13:00:00+07:00');
    assert.equal(timesOverlap(nine, eleven, eleven, thirteen), false);
  });
});
