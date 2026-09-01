import { z } from 'zod';
import { SPORTS } from '../../../shared/constants/sports.js';

const footballResultSchema = z.object({
  teamAGoals: z
    .number({ required_error: 'teamAGoals is required' })
    .int('teamAGoals must be an integer')
    .min(0, 'teamAGoals must be >= 0'),
  teamBGoals: z
    .number({ required_error: 'teamBGoals is required' })
    .int('teamBGoals must be an integer')
    .min(0, 'teamBGoals must be >= 0'),
});

const badmintonSetSchema = z.object({
  teamAPoints: z
    .number({ required_error: 'teamAPoints is required' })
    .int('teamAPoints must be an integer')
    .min(0),
  teamBPoints: z
    .number({ required_error: 'teamBPoints is required' })
    .int('teamBPoints must be an integer')
    .min(0),
});

const badmintonResultSchema = z.object({
  sets: z
    .array(badmintonSetSchema, { required_error: 'sets is required' })
    .min(1, 'At least one set is required')
    .max(3, 'At most 3 sets allowed'),
});

export function parseFootballMatchResultDto(body) {
  return footballResultSchema.parse(body);
}

export function parseBadmintonMatchResultDto(body) {
  return badmintonResultSchema.parse(body);
}

export function parseMatchResultDto(body, sport) {
  if (sport === SPORTS.FOOTBALL) {
    return { kind: 'FOOTBALL', ...parseFootballMatchResultDto(body) };
  }
  if (sport === SPORTS.BADMINTON) {
    return { kind: 'BADMINTON', ...parseBadmintonMatchResultDto(body) };
  }
  throw new Error('Unsupported sport for match result');
}
