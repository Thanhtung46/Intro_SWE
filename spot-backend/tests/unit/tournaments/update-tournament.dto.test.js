import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseUpdateTournamentDto } from '../../../src/domains/tournaments/dto/update-tournament.dto.js';
import { parseCompleteTournamentDto } from '../../../src/domains/tournaments/dto/complete-tournament.dto.js';
import {
  findActiveLockedPatchFields,
  isTournamentPatchLockedStatus,
  TOURNAMENT_STATUSES,
} from '../../../src/shared/constants/tournaments.js';

describe('parseUpdateTournamentDto', () => {
  it('accepts partial description update', () => {
    const dto = parseUpdateTournamentDto({ description: 'Updated rules in About.' });
    assert.equal(dto.description, 'Updated rules in About.');
  });

  it('accepts winners podium', () => {
    const dto = parseUpdateTournamentDto({
      winners: [
        { place: 1, teamId: 10 },
        { place: 2, teamId: 11 },
      ],
    });
    assert.equal(dto.winners.length, 2);
  });

  it('accepts player in-team ranks', () => {
    const dto = parseUpdateTournamentDto({
      playerRanks: [
        { rosterPlayerId: 5, rank: 1 },
        { rosterPlayerId: 6, rank: 2 },
      ],
    });
    assert.equal(dto.playerRanks[0].rank, 1);
  });

  it('rejects empty body', () => {
    assert.throws(() => parseUpdateTournamentDto({}), /At least one field is required/);
  });

  it('requires latitude and longitude together', () => {
    assert.throws(
      () => parseUpdateTournamentDto({ latitude: 10.1 }),
      /latitude and longitude must be sent together/,
    );
  });

  it('rejects duplicate winner places', () => {
    assert.throws(
      () =>
        parseUpdateTournamentDto({
          winners: [
            { place: 1, teamId: 1 },
            { place: 1, teamId: 2 },
          ],
        }),
      /winners places must be unique/,
    );
  });
});

describe('parseCompleteTournamentDto', () => {
  it('accepts empty body', () => {
    const dto = parseCompleteTournamentDto({});
    assert.equal(dto.winners, undefined);
  });

  it('accepts optional winners on complete', () => {
    const dto = parseCompleteTournamentDto({
      winners: [{ place: 1, teamId: 3 }],
    });
    assert.equal(dto.winners[0].teamId, 3);
  });
});

describe('tournament patch lock helpers', () => {
  it('flags locked fields after ACTIVE', () => {
    assert.equal(isTournamentPatchLockedStatus(TOURNAMENT_STATUSES.ACTIVE), true);
    assert.deepEqual(findActiveLockedPatchFields({ venueName: 'New Arena' }), [
      'venueName',
    ]);
    assert.deepEqual(findActiveLockedPatchFields({ description: 'x' }), []);
  });
});
