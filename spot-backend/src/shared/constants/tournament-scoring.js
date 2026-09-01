import { BADMINTON_SET_POINTS_TARGET } from './tournaments.js';

/** 15-point set, win by 2; deuce from 14–14 / 15–15 onward. */
export function isValidBadmintonSet(teamAPoints, teamBPoints) {
  const a = Number(teamAPoints);
  const b = Number(teamBPoints);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    return false;
  }
  if (a === b) {
    return false;
  }
  const winner = Math.max(a, b);
  const loser = Math.min(a, b);
  if (winner < BADMINTON_SET_POINTS_TARGET) {
    return false;
  }
  return winner - loser >= 2;
}

export function validateBadmintonSets(sets) {
  if (!Array.isArray(sets) || sets.length < 1 || sets.length > 3) {
    return 'Badminton result must have 1 to 3 sets';
  }

  let teamASets = 0;
  let teamBSets = 0;

  for (let index = 0; index < sets.length; index += 1) {
    const set = sets[index];
    const a = set?.teamAPoints;
    const b = set?.teamBPoints;
    if (!isValidBadmintonSet(a, b)) {
      return `Set ${index + 1} is invalid (15 points, win by 2, deuce allowed)`;
    }
    if (a > b) {
      teamASets += 1;
    } else {
      teamBSets += 1;
    }
  }

  const maxSetsWon = Math.max(teamASets, teamBSets);
  if (maxSetsWon > 2) {
    return 'A best-of-3 match cannot have more than 2 sets won by one team';
  }
  if (sets.length === 2 && teamASets === 1 && teamBSets === 1) {
    return 'Two sets split 1-1 — add the deciding set or enter one set only while in progress';
  }
  if (sets.length === 3 && teamASets !== 2 && teamBSets !== 2) {
    return 'Three sets must produce a 2-1 match winner';
  }

  return null;
}

export function badmintonMatchWinnerTeamSide(sets) {
  let teamASets = 0;
  let teamBSets = 0;
  for (const set of sets) {
    if (set.teamAPoints > set.teamBPoints) {
      teamASets += 1;
    } else {
      teamBSets += 1;
    }
  }
  if (teamASets === teamBSets) {
    return null;
  }
  return teamASets > teamBSets ? 'A' : 'B';
}

export function footballMatchOutcome(teamAGoals, teamBGoals) {
  if (teamAGoals === teamBGoals) {
    return { outcome: 'DRAW', winnerSide: null };
  }
  return {
    outcome: 'WIN',
    winnerSide: teamAGoals > teamBGoals ? 'A' : 'B',
  };
}

export function winnerTeamIdFromSide(side, teamAId, teamBId) {
  if (side === 'A') {
    return teamAId;
  }
  if (side === 'B') {
    return teamBId;
  }
  return null;
}
