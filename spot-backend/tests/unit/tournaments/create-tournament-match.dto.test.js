import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCreateTournamentMatchDto } from '../../../src/domains/tournaments/dto/create-tournament-match.dto.js';
import { parseFootballMatchResultDto } from '../../../src/domains/tournaments/dto/tournament-match-result.dto.js';

describe('create tournament match dto', () => {
  it('accepts group stage pairing', () => {
    const dto = parseCreateTournamentMatchDto({
      round: 'GROUP_STAGE',
      teamAId: 1,
      teamBId: 2,
      scheduledAt: '2026-09-02T14:00:00+07:00',
    });
    assert.equal(dto.round, 'GROUP_STAGE');
    assert.equal(dto.teamAId, 1);
  });

  it('rejects same team ids', () => {
    assert.throws(() =>
      parseCreateTournamentMatchDto({
        round: 'FINAL',
        teamAId: 3,
        teamBId: 3,
        scheduledAt: '2026-09-02T14:00:00+07:00',
      }),
    );
  });
});

describe('football match result dto', () => {
  it('accepts draw scores', () => {
    const dto = parseFootballMatchResultDto({ teamAGoals: 1, teamBGoals: 1 });
    assert.equal(dto.teamAGoals, 1);
  });
});
