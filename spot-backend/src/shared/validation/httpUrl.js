import { z } from 'zod';

export const HTTP_URL_MAX_LENGTH = 2048;

export function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > HTTP_URL_MAX_LENGTH) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

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

export function requiredHttpUrl(fieldName) {
  return z
    .string({ required_error: `${fieldName} is required` })
    .trim()
    .min(1, `${fieldName} is required`)
    .superRefine((value, ctx) => {
      if (value.length > HTTP_URL_MAX_LENGTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} must be at most ${HTTP_URL_MAX_LENGTH} characters`,
        });
        return;
      }
      let parsed;
      try {
        parsed = new URL(value);
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
    });
}
