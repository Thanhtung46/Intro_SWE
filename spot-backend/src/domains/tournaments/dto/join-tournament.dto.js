import { z } from 'zod';
import { SPORTS } from '../../../shared/constants/sports.js';
import {
  maxFootballSquadSize,
  requiredBadmintonRosterSize,
} from '../../../shared/constants/tournaments.js';
import { requiredHttpUrl } from '../../../shared/validation/httpUrl.js';

const footballPlayerSchema = z.object({
  name: z
    .string({ required_error: 'Player name is required' })
    .trim()
    .min(1, 'Player name is required')
    .max(120, 'Player name must be at most 120 characters'),
  jerseyNumber: z
    .number({ required_error: 'jerseyNumber is required' })
    .int('jerseyNumber must be an integer')
    .min(0, 'jerseyNumber must be >= 0')
    .max(999, 'jerseyNumber must be at most 999'),
});

const badmintonPlayerSchema = z.object({
  name: z
    .string({ required_error: 'Player name is required' })
    .trim()
    .min(1, 'Player name is required')
    .max(120, 'Player name must be at most 120 characters'),
});

export const joinTournamentBodySchema = z.object({
  teamName: z
    .string({ required_error: 'teamName is required' })
    .trim()
    .min(1, 'teamName is required')
    .max(150, 'teamName must be at most 150 characters'),
  teamLogoUrl: requiredHttpUrl('teamLogoUrl'),
  roster: z.array(z.unknown(), { required_error: 'roster is required' }).min(1),
});

export function parseJoinTournamentBody(body) {
  return joinTournamentBodySchema.parse(body);
}

export function parseJoinRoster(sport, format, roster) {
  if (sport === SPORTS.FOOTBALL) {
    const maxSize = maxFootballSquadSize(format);
    if (maxSize == null) {
      throw new Error('Invalid football format');
    }
    if (roster.length > maxSize) {
      throw new Error(`Football roster must have at most ${maxSize} players`);
    }
    const jerseys = new Set();
    return roster.map((item, index) => {
      const result = footballPlayerSchema.safeParse(item);
      if (!result.success) {
        const issue = result.error.issues[0];
        throw new Error(`roster[${index}]: ${issue.message}`);
      }
      if (jerseys.has(result.data.jerseyNumber)) {
        throw new Error(
          `roster[${index}]: jerseyNumber must be unique within the team`,
        );
      }
      jerseys.add(result.data.jerseyNumber);
      return result.data;
    });
  }

  if (sport === SPORTS.BADMINTON) {
    const requiredSize = requiredBadmintonRosterSize(format);
    if (requiredSize == null) {
      throw new Error('Invalid badminton format');
    }
    if (roster.length !== requiredSize) {
      throw new Error(
        `Badminton roster must have exactly ${requiredSize} player(s)`,
      );
    }
    return roster.map((item, index) => {
      const result = badmintonPlayerSchema.safeParse(item);
      if (!result.success) {
        const issue = result.error.issues[0];
        throw new Error(`roster[${index}]: ${issue.message}`);
      }
      return result.data;
    });
  }

  throw new Error('Unsupported sport for roster validation');
}
