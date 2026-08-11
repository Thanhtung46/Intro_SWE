import { z } from 'zod';

export const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .trim()
    .min(1, 'Refresh token is required'),
});

export function parseRefreshDto(body) {
  return refreshSchema.parse(body);
}
