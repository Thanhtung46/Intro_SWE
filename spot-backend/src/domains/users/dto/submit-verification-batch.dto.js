import { z } from 'zod';
import { isHttpUrl } from '../../../shared/validation/httpUrl.js';
import {
  VERIFICATION_REQUEST_TYPES,
  VERIFICATION_DOCUMENT_KINDS,
} from '../../../shared/constants/admin.js';
import { REFEREE_SIGNUP_DOCUMENT_KINDS } from '../../../shared/constants/referee.js';

const signupKindEnum = z.enum(REFEREE_SIGNUP_DOCUMENT_KINDS);

const batchDocumentSchema = z.object({
  documentKind: signupKindEnum,
  documentUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(isHttpUrl, 'documentUrl must be a valid http(s) URL'),
});

export const submitVerificationBatchSchema = z
  .object({
    documents: z.array(batchDocumentSchema).length(3),
  })
  .superRefine((val, ctx) => {
    const kinds = val.documents.map((d) => d.documentKind);
    const unique = new Set(kinds);
    if (unique.size !== REFEREE_SIGNUP_DOCUMENT_KINDS.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `documents must include exactly one of each: ${REFEREE_SIGNUP_DOCUMENT_KINDS.join(', ')}`,
        path: ['documents'],
      });
    }
    for (const required of REFEREE_SIGNUP_DOCUMENT_KINDS) {
      if (!unique.has(required)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing documentKind ${required}`,
          path: ['documents'],
        });
      }
    }
  });

export function parseSubmitVerificationBatchDto(body) {
  return submitVerificationBatchSchema.parse(body ?? {});
}

export const submitCertUpdateSchema = z.object({
  documentKind: z.literal(VERIFICATION_DOCUMENT_KINDS.CERT_UPDATE),
  documentUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(isHttpUrl, 'documentUrl must be a valid http(s) URL'),
  title: z.string().trim().min(1).max(200).optional(),
});

export function parseSubmitCertUpdateDto(body) {
  return submitCertUpdateSchema.parse(body ?? {});
}

/** Legacy single-doc submit still used by Owner. */
export { submitVerificationSchema, parseSubmitVerificationDto } from './submit-verification.dto.js';
