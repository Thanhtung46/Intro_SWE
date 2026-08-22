import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidBadmintonSet,
  validateBadmintonSets,
  footballMatchOutcome,
  badmintonMatchWinnerTeamSide,
} from '../../../src/shared/constants/tournament-scoring.js';

describe('badminton set scoring', () => {
  it('accepts straight 15-point wins', () => {
    assert.equal(isValidBadmintonSet(15, 10), true);
    assert.equal(isValidBadmintonSet(15, 14), false);
  });

  it('accepts deuce beyond 15', () => {
    assert.equal(isValidBadmintonSet(17, 15), true);
    assert.equal(isValidBadmintonSet(16, 14), true);
  });

  it('validates a completed best-of-3 result', () => {
    assert.equal(
      validateBadmintonSets([
        { teamAPoints: 15, teamBPoints: 12 },
        { teamAPoints: 13, teamBPoints: 15 },
        { teamAPoints: 15, teamBPoints: 10 },
      ]),
      null,
    );
  });

  it('rejects split after two sets', () => {
    assert.match(
      validateBadmintonSets([
        { teamAPoints: 15, teamBPoints: 12 },
        { teamAPoints: 10, teamBPoints: 15 },
      ]),
      /deciding set/i,
    );
  });
});

describe('football match outcome', () => {
  it('detects draw and winners', () => {
    assert.deepEqual(footballMatchOutcome(2, 2), {
      outcome: 'DRAW',
      winnerSide: null,
    });
    assert.deepEqual(footballMatchOutcome(3, 1), {
      outcome: 'WIN',
      winnerSide: 'A',
    });
  });
});

describe('badminton match winner side', () => {
  it('returns side A on 2-0 sets', () => {
    assert.equal(
      badmintonMatchWinnerTeamSide([
        { teamAPoints: 15, teamBPoints: 8 },
        { teamAPoints: 15, teamBPoints: 11 },
      ]),
      'A',
    );
  });
});
