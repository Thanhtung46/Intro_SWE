import { z } from 'zod';
import {
  TOURNAMENT_MINE_SECTION_CODES,
  TOURNAMENT_MINE_SECTIONS,
  TOURNAMENT_MINE_TAB_CODES,
  TOURNAMENT_MINE_TABS,
} from '../../../shared/constants/tournaments.js';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const listTournamentMineQuerySchema = z
  .object({
    tab: z.preprocess(
      blankToUndefined,
      z
        .enum(TOURNAMENT_MINE_TAB_CODES, {
          errorMap: () => ({
            message: `tab must be one of: ${TOURNAMENT_MINE_TAB_CODES.join(', ')}`,
          }),
        })
        .optional()
        .default(TOURNAMENT_MINE_TABS.HOSTED),
    ),
    section: z.preprocess(
      blankToUndefined,
      z
        .enum(TOURNAMENT_MINE_SECTION_CODES, {
          errorMap: () => ({
            message: `section must be one of: ${TOURNAMENT_MINE_SECTION_CODES.join(', ')}`,
          }),
        })
        .optional()
        .default(TOURNAMENT_MINE_SECTIONS.TOURNAMENTS),
    ),
    limit: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(1).max(50).optional().default(20),
    ),
    offset: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(0).optional().default(0),
    ),
  })
  .superRefine((data, ctx) => {
    if (
      data.tab === TOURNAMENT_MINE_TABS.HOSTED &&
      data.section === TOURNAMENT_MINE_SECTIONS.JOIN_REQUESTS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: 'join-requests section is only valid for tab=joined',
      });
    }
    if (
      data.tab === TOURNAMENT_MINE_TABS.JOINED &&
      data.section === TOURNAMENT_MINE_SECTIONS.PENDING_REQUESTS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: 'pending-requests section is only valid for tab=hosted',
      });
    }
  });

export function parseListTournamentMineQuery(query) {
  return listTournamentMineQuerySchema.parse(query);
}
