import { z } from 'zod';

export const joinGroupSchema = z.object({
  message: z
    .string()
    .trim()
    .max(500, 'message must be at most 500 characters')
    .nullish(),
});

export function parseJoinGroupDto(body) {
  return joinGroupSchema.parse(body ?? {});
}
