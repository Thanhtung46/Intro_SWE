import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MATCH_OUTCOMES, MATCH_STATUSES } from '../../../src/shared/constants/matchmaking.js';
import { resolveMatchOutcome } from '../../../src/domains/matchmaking/match-outcome.js';

describe('resolveMatchOutcome', () => {
  const now = Date.parse('2026-10-21T12:00:00.000Z');

  it('returns null for active kèo', () => {
    assert.equal(
      resolveMatchOutcome(
        {
          status: MATCH_STATUSES.OPEN,
          filled_count: 5,
          max_players: 14,
          ends_at: '2026-10-22T10:00:00.000Z',
        },
        { now },
      ),
      null,
    );
  });

  it('treats expired underfilled as cancelled', () => {
    const result = resolveMatchOutcome(
      {
        status: MATCH_STATUSES.OPEN,
        filled_count: 10,
        max_players: 14,
        ends_at: '2026-10-20T10:00:00.000Z',
      },
      { now },
    );
    assert.equal(result.outcome, MATCH_OUTCOMES.CANCELLED);
    assert.match(result.message, /10\/14/);
  });

  it('returns cancelled outcome', () => {
    const result = resolveMatchOutcome(
      {
        status: MATCH_STATUSES.CANCELLED,
        filled_count: 3,
        max_players: 10,
        ends_at: '2026-10-20T10:00:00.000Z',
      },
      { now },
    );
    assert.equal(result.outcome, MATCH_OUTCOMES.CANCELLED);
  });

  it('returns completed when expired and full', () => {
    const result = resolveMatchOutcome(
      {
        status: MATCH_STATUSES.FULL,
        filled_count: 14,
        max_players: 14,
        ends_at: '2026-10-20T10:00:00.000Z',
      },
      { now },
    );
    assert.equal(result.outcome, MATCH_OUTCOMES.COMPLETED);
  });
});
