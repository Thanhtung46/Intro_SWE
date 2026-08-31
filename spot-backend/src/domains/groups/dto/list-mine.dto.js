import { z } from 'zod';
import {
  GROUP_MINE_SECTION_CODES,
  GROUP_MINE_SECTIONS,
  GROUP_MINE_TAB_CODES,
  GROUP_MINE_TABS,
} from '../../../shared/constants/groups.js';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const listGroupMineQuerySchema = z
  .object({
    tab: z.preprocess(
      blankToUndefined,
      z
        .enum(GROUP_MINE_TAB_CODES, {
          errorMap: () => ({
            message: `tab must be one of: ${GROUP_MINE_TAB_CODES.join(', ')}`,
          }),
        })
        .optional()
        .default(GROUP_MINE_TABS.MANAGED),
    ),
    section: z.preprocess(
      blankToUndefined,
      z
        .enum(GROUP_MINE_SECTION_CODES, {
          errorMap: () => ({
            message: `section must be one of: ${GROUP_MINE_SECTION_CODES.join(', ')}`,
          }),
        })
        .optional()
        .default(GROUP_MINE_SECTIONS.GROUPS),
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
      data.tab === GROUP_MINE_TABS.MANAGED &&
      data.section === GROUP_MINE_SECTIONS.JOIN_REQUESTS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: 'join-requests section is only valid for tab=joined',
      });
    }
    if (
      data.tab === GROUP_MINE_TABS.JOINED &&
      data.section === GROUP_MINE_SECTIONS.PENDING_REQUESTS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: 'pending-requests section is only valid for tab=managed',
      });
    }
  });

export function parseListGroupMineQuery(query) {
  return listGroupMineQuerySchema.parse(query);
}
