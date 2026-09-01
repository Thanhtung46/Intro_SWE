import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBadgeLabel,
  maxFootballSquadSize,
  requiredBadmintonRosterSize,
  GENDER_DIVISIONS,
} from '../../../src/shared/constants/tournaments.js';

describe('tournaments constants', () => {
  it('computes football squad caps as format + 5', () => {
    assert.equal(maxFootballSquadSize('FIVE_A_SIDE'), 10);
    assert.equal(maxFootballSquadSize('SEVEN_A_SIDE'), 12);
    assert.equal(maxFootballSquadSize('ELEVEN_A_SIDE'), 16);
  });

  it('maps badminton roster sizes', () => {
    assert.equal(requiredBadmintonRosterSize('MS'), 1);
    assert.equal(requiredBadmintonRosterSize('MD'), 2);
    assert.equal(requiredBadmintonRosterSize('MIXED'), 2);
  });

  it('builds format badge labels', () => {
    assert.equal(formatBadgeLabel('ELEVEN_A_SIDE', GENDER_DIVISIONS.MEN), '11v11');
    assert.equal(
      formatBadgeLabel('ELEVEN_A_SIDE', GENDER_DIVISIONS.WOMEN),
      "11v11 Women's",
    );
    assert.equal(formatBadgeLabel('MS', null), "Men's Singles");
  });
});
