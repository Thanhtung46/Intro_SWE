import { z } from 'zod';

// ~10MB decoded audio, base64 is ~4/3 the size of raw bytes.
const MAX_AUDIO_BASE64_CHARS = 14_000_000;

export const sendMessageSchema = z
  .object({
    inputMode: z.enum(['text', 'voice']),
    text: z.string().trim().max(2000).optional(),
    audio: z.string().max(MAX_AUDIO_BASE64_CHARS, 'audio payload too large').optional(),
    audioMimeType: z.string().trim().optional(),
  })
  .superRefine((body, ctx) => {
    if (body.inputMode === 'text' && !body.text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['text'],
        message: 'text is required when inputMode is text',
      });
    }
    if (body.inputMode === 'voice') {
      if (!body.audio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['audio'],
          message: 'audio is required when inputMode is voice',
        });
      }
      if (!body.audioMimeType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['audioMimeType'],
          message: 'audioMimeType is required when inputMode is voice',
        });
      }
    }
  });

export function parseSendMessageDto(body) {
  return sendMessageSchema.parse(body ?? {});
}
