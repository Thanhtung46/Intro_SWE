import { z } from 'zod';
import { isHttpUrl } from '../../../shared/validation/httpUrl.js';
import {
  VERIFICATION_REQUEST_TYPES,
} from '../../../shared/constants/admin.js';

export const submitVerificationSchema = z.object({
  documentUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(isHttpUrl, 'documentUrl must be a valid http(s) URL'),
  requestType: z.enum([
    VERIFICATION_REQUEST_TYPES.OWNER_LICENSE,
    VERIFICATION_REQUEST_TYPES.REFEREE_CREDENTIAL,
  ]),
});

export function parseSubmitVerificationDto(body) {
  return submitVerificationSchema.parse(body);
}
