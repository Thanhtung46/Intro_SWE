import { z } from 'zod';

export const HTTP_URL_MAX_LENGTH = 2048;

export function optionalHttpUrl(fieldName) {
  return z
    .union([z.string(), z.null()])
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined || value === null) {
        return;
      }
      const trimmed = value.trim();
      if (!trimmed || trimmed.length > HTTP_URL_MAX_LENGTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            trimmed.length > HTTP_URL_MAX_LENGTH
              ? `${fieldName} must be at most ${HTTP_URL_MAX_LENGTH} characters`
              : `${fieldName} must be a valid http(s) URL`,
        });
        return;
      }
      let parsed;
      try {
        parsed = new URL(trimmed);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} must be a valid http(s) URL`,
        });
        return;
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} must be a valid http(s) URL`,
        });
      }
    })
    .transform((value) => {
      if (value === undefined || value === null) {
        return value;
      }
      return value.trim();
    });
}
