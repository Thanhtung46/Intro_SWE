import { z } from 'zod';
import {
  VERIFICATION_STATUSES,
} from '../../../shared/constants/admin.js';
import { USER_ROLES } from '../../../shared/constants/auth.js';

export const listApprovalsSchema = z.object({
  status: z
    .enum([
      VERIFICATION_STATUSES.PENDING,
      VERIFICATION_STATUSES.APPROVED,
      VERIFICATION_STATUSES.REJECTED,
    ])
    .optional()
    .default(VERIFICATION_STATUSES.PENDING),
  role: z.enum([USER_ROLES.OWNER, USER_ROLES.REFEREE]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function parseListApprovalsDto(query) {
  return listApprovalsSchema.parse(query);
}

export const approvalIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function parseApprovalIdParam(params) {
  return approvalIdParamSchema.parse(params);
}

export const rejectApprovalSchema = z.object({
  reason: z.string().trim().min(1).max(2000).optional(),
});

export function parseRejectApprovalDto(body) {
  return rejectApprovalSchema.parse(body ?? {});
}

export const approveApprovalSchema = z.object({
  certifiedSportTypes: z
    .array(z.enum(['football', 'badminton', 'Football', 'Badminton']))
    .min(1)
    .max(2)
    .optional(),
});

export function parseApproveApprovalDto(body) {
  return approveApprovalSchema.parse(body ?? {});
}
