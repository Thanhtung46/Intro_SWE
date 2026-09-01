import { z } from 'zod';
import { USER_ROLES, USER_STATUSES } from '../../../shared/constants/auth.js';

export const listUsersSchema = z.object({
  role: z
    .enum([
      USER_ROLES.PLAYER,
      USER_ROLES.OWNER,
      USER_ROLES.REFEREE,
      USER_ROLES.ADMIN,
    ])
    .optional(),
  status: z
    .enum([
      USER_STATUSES.ACTIVE,
      USER_STATUSES.PENDING,
      USER_STATUSES.LOCKED,
    ])
    .optional(),
  q: z.string().trim().max(150).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function parseListUsersDto(query) {
  return listUsersSchema.parse(query);
}

export const adminUserIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function parseAdminUserIdParam(params) {
  return adminUserIdParamSchema.parse(params);
}

export const updateUserSchema = z
  .object({
    role: z
      .enum([
        USER_ROLES.PLAYER,
        USER_ROLES.OWNER,
        USER_ROLES.REFEREE,
      ])
      .optional(),
    status: z
      .enum([
        USER_STATUSES.ACTIVE,
        USER_STATUSES.PENDING,
        USER_STATUSES.LOCKED,
      ])
      .optional(),
  })
  .refine((v) => v.role !== undefined || v.status !== undefined, {
    message: 'Provide at least one of role or status',
  });

export function parseUpdateUserDto(body) {
  return updateUserSchema.parse(body);
}
