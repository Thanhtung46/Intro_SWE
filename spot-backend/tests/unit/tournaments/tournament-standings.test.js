import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SPORTS } from '../../../src/shared/constants/sports.js';
import { badmintonMatchWinnerTeamSide } from '../../../src/shared/constants/tournament-scoring.js';
import { computeStandings } from '../../../src/shared/constants/tournament-standings.js';

const teams = [
  { teamId: 1, teamName: 'Alpha FC', teamLogoUrl: 'https://a.png' },
  { teamId: 2, teamName: 'Beta FC', teamLogoUrl: 'https://b.png' },
  { teamId: 3, teamName: 'Gamma FC', teamLogoUrl: 'https://c.png' },
];

describe('computeStandings football', () => {
  it('ranks by pts then goal difference', () => {
    const standings = computeStandings({
      sport: SPORTS.FOOTBALL,
      teams,
      matches: [
        {
          team_a_id: 1,
          team_b_id: 2,
          team_a_goals: 2,
          team_b_goals: 0,
          round: 'GROUP_STAGE',
        },
        {
          team_a_id: 1,
          team_b_id: 3,
          team_a_goals: 1,
          team_b_goals: 1,
          round: 'GROUP_STAGE',
        },
        {
          team_a_id: 2,
          team_b_id: 3,
          team_a_goals: 3,
          team_b_goals: 1,
          round: 'GROUP_STAGE',
        },
      ],
      badmintonMatchWinnerTeamSide,
    });

    assert.equal(standings[0].teamId, 1);
    assert.equal(standings[0].pts, 4);
    assert.equal(standings[0].rank, 1);
    assert.equal(standings.find((row) => row.teamId === 2).pts, 3);
    assert.equal(standings.find((row) => row.teamId === 3).played, 2);
  });

  it('filters by round when requested', () => {
    const standings = computeStandings({
      sport: SPORTS.FOOTBALL,
      teams,
      matches: [
        {
          team_a_id: 1,
          team_b_id: 2,
          team_a_goals: 1,
          team_b_goals: 0,
          round: 'GROUP_STAGE',
        },
        {
          team_a_id: 1,
          team_b_id: 3,
          team_a_goals: 5,
          team_b_goals: 0,
          round: 'FINAL',
        },
      ],
      round: 'GROUP_STAGE',
      badmintonMatchWinnerTeamSide,
    });

    assert.equal(standings.find((row) => row.teamId === 1).played, 1);
    assert.equal(standings.find((row) => row.teamId === 3).played, 0);
  });
});

describe('computeStandings badminton', () => {
  it('awards 3 pts per match win and uses set difference', () => {
    const standings = computeStandings({
      sport: SPORTS.BADMINTON,
      teams: teams.slice(0, 2),
      matches: [
        {
          team_a_id: 1,
          team_b_id: 2,
          sets_json: [
            { teamAPoints: 15, teamBPoints: 10 },
            { teamAPoints: 15, teamBPoints: 12 },
          ],
          round: 'GROUP_STAGE',
        },
      ],
      badmintonMatchWinnerTeamSide,
    });

    const alpha = standings.find((row) => row.teamId === 1);
    const beta = standings.find((row) => row.teamId === 2);
    assert.equal(alpha.pts, 3);
    assert.equal(alpha.won, 1);
    assert.equal(alpha.setDifference, 2);
    assert.equal(beta.pts, 0);
    assert.equal(beta.lost, 1);
    assert.equal(beta.drawn, undefined);
  });

  it('ignores incomplete badminton matches', () => {
    const standings = computeStandings({
      sport: SPORTS.BADMINTON,
      teams: teams.slice(0, 2),
      matches: [
        {
          team_a_id: 1,
          team_b_id: 2,
          sets_json: [{ teamAPoints: 15, teamBPoints: 12 }],
          round: 'GROUP_STAGE',
        },
      ],
      badmintonMatchWinnerTeamSide,
    });

    assert.equal(standings.every((row) => row.played === 0), true);
  });
});
