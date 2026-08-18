import { z } from 'zod';
import { MINE_TAB_CODES, MINE_TABS } from '../../../shared/constants/matchmaking.js';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const listMineQuerySchema = z.object({
  tab: z.preprocess(
    blankToUndefined,
    z
      .enum(MINE_TAB_CODES, {
        errorMap: () => ({
          message: `tab must be one of: ${MINE_TAB_CODES.join(', ')}`,
        }),
      })
      .optional()
      .default(MINE_TABS.ACTIVE),
  ),
  limit: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).max(50).optional().default(20),
  ),
  offset: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(0).optional().default(0),
  ),
});

export function parseListMineQuery(query) {
  return listMineQuerySchema.parse(query);
}
