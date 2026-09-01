import pool from '../../../shared/database/pool.js';
import redis from '../../../shared/database/redis.js';
import config from '../../../shared/config/env.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import {
  VERIFICATION_REQUEST_TYPES,
  VERIFICATION_STATUSES,
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_TYPES,
  SYSTEM_SETTING_KEYS,
} from '../../../shared/constants/admin.js';
import { USER_ROLES, USER_STATUSES } from '../../../shared/constants/auth.js';
import { sendNotificationEmail } from '../../../shared/utils/mailer.js';
import * as verificationRepository from '../repository/verification-request.repository.js';
import * as auditRepository from '../repository/admin-audit.repository.js';
import * as adminUserRepository from '../repository/admin-user.repository.js';
import * as settingsRepository from '../repository/system-settings.repository.js';
import {
  toVerificationRequestRow,
  toAuditLogRow,
  toAdminUserRow,
} from '../entity/admin.entity.js';

async function writeAudit(client, {
  adminUserId,
  action,
  targetType,
  targetId,
  payload,
}) {
  const row = await auditRepository.insertAudit(client, {
    adminUserId,
    action,
    targetType,
    targetId,
    payload,
  });
  return toAuditLogRow(row);
}

async function notifyApplicant({ email, subject, text }) {
  try {
    await sendNotificationEmail({ email, subject, text });
  } catch {
    /* email failure should not roll back approval */
  }
}

function requestTypeForRole(role) {
  if (role === USER_ROLES.OWNER) return VERIFICATION_REQUEST_TYPES.OWNER_LICENSE;
  if (role === USER_ROLES.REFEREE) {
    return VERIFICATION_REQUEST_TYPES.REFEREE_CREDENTIAL;
  }
  return null;
}

export async function submitVerificationRequest(userId, dto) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await adminUserRepository.findAdminUserById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.status !== USER_STATUSES.PENDING) {
      throw new AppError(
        'Verification requests are only for pending Owner/Referee accounts',
        400,
      );
    }

    const expectedType = requestTypeForRole(user.role);
    if (!expectedType) {
      throw new AppError(
        'Only Venue Owner and Referee accounts require verification',
        400,
      );
    }

    if (dto.requestType !== expectedType) {
      throw new AppError(
        `requestType must be ${expectedType} for role ${user.role}`,
        400,
      );
    }

    const pending = await verificationRepository.findPendingByUserId(
      client,
      userId,
    );
    if (pending) {
      throw new AppError(
        'A pending verification request already exists for this account',
        409,
      );
    }

    const rejected = await verificationRepository.findLatestRejectedByUserId(
      client,
      userId,
    );

    let row;
    if (rejected) {
      row = await verificationRepository.resetRejectedForResubmit(
        client,
        rejected.verification_req_id,
        { documentUrl: dto.documentUrl },
      );
    } else {
      row = await verificationRepository.insertRequest(client, {
        userId,
        requestType: dto.requestType,
        documentUrl: dto.documentUrl,
      });
    }

    await client.query('COMMIT');

    const detail = await verificationRepository.findById(
      client,
      row.verification_req_id,
    );
    return {
      message: 'Verification request submitted',
      request: toVerificationRequestRow(detail),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function uploadVerificationDocument(userId, file) {
  if (!file) {
    throw new AppError('Document file is required (field name: document)', 400);
  }

  const documentUrl = `${config.publicBaseUrl}/uploads/verification/${file.filename}`;

  return {
    message: 'Document uploaded',
    documentUrl,
  };
}

export async function listApprovals(query) {
  const client = await pool.connect();
  try {
    const { rows, total } = await verificationRepository.listRequests(client, query);
    return {
      items: rows.map(toVerificationRequestRow),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  } finally {
    client.release();
  }
}

export async function getApprovalDetail(verificationReqId) {
  const client = await pool.connect();
  try {
    const row = await verificationRepository.findById(client, verificationReqId);
    if (!row) {
      throw new AppError('Verification request not found', 404);
    }
    return { request: toVerificationRequestRow(row) };
  } finally {
    client.release();
  }
}

export async function approveRequest(adminUserId, verificationReqId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await verificationRepository.findById(
      client,
      verificationReqId,
    );
    if (!existing) {
      throw new AppError('Verification request not found', 404);
    }
    if (existing.status !== VERIFICATION_STATUSES.PENDING) {
      throw new AppError('Only pending requests can be approved', 409);
    }

    await verificationRepository.updateReview(client, verificationReqId, {
      status: VERIFICATION_STATUSES.APPROVED,
      adminNotes: null,
      reviewedBy: adminUserId,
    });

    await adminUserRepository.updateUserStatus(
      client,
      existing.user_id,
      USER_STATUSES.ACTIVE,
    );

    const audit = await writeAudit(client, {
      adminUserId,
      action: ADMIN_AUDIT_ACTIONS.APPROVAL_APPROVE,
      targetType: ADMIN_AUDIT_TARGET_TYPES.VERIFICATION_REQUEST,
      targetId: String(verificationReqId),
      payload: {
        userId: existing.user_id,
        previousUserStatus: existing.user_status,
        newUserStatus: USER_STATUSES.ACTIVE,
      },
    });

    await client.query('COMMIT');

    await notifyApplicant({
      email: existing.email,
      subject: 'SPOT account approved',
      text: [
        'Your SPOT registration has been approved.',
        '',
        'You can now log in and use the platform.',
      ].join('\n'),
    });

    const detail = await verificationRepository.findById(
      client,
      verificationReqId,
    );

    return {
      message: 'Registration approved',
      request: toVerificationRequestRow(detail),
      audit,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function rejectRequest(adminUserId, verificationReqId, dto) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await verificationRepository.findById(
      client,
      verificationReqId,
    );
    if (!existing) {
      throw new AppError('Verification request not found', 404);
    }
    if (existing.status !== VERIFICATION_STATUSES.PENDING) {
      throw new AppError('Only pending requests can be rejected', 409);
    }

    await verificationRepository.updateReview(client, verificationReqId, {
      status: VERIFICATION_STATUSES.REJECTED,
      adminNotes: dto.reason ?? null,
      reviewedBy: adminUserId,
    });

    const audit = await writeAudit(client, {
      adminUserId,
      action: ADMIN_AUDIT_ACTIONS.APPROVAL_REJECT,
      targetType: ADMIN_AUDIT_TARGET_TYPES.VERIFICATION_REQUEST,
      targetId: String(verificationReqId),
      payload: {
        userId: existing.user_id,
        reason: dto.reason ?? null,
        userStatus: USER_STATUSES.PENDING,
      },
    });

    await client.query('COMMIT');

    const reasonLine = dto.reason
      ? `\n\nReason: ${dto.reason}`
      : '';

    await notifyApplicant({
      email: existing.email,
      subject: 'SPOT registration requires changes',
      text: [
        'Your SPOT registration was not approved at this time.',
        reasonLine,
        '',
        'You may submit updated documents from the app.',
      ].join('\n'),
    });

    const detail = await verificationRepository.findById(
      client,
      verificationReqId,
    );

    return {
      message: 'Registration rejected',
      request: toVerificationRequestRow(detail),
      audit,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listUsers(query) {
  const client = await pool.connect();
  try {
    const { rows, total } = await adminUserRepository.listUsers(client, query);
    return {
      items: rows.map(toAdminUserRow),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  } finally {
    client.release();
  }
}

export async function getUserDetail(userId) {
  const client = await pool.connect();
  try {
    const row = await adminUserRepository.findAdminUserById(client, userId);
    if (!row) {
      throw new AppError('User not found', 404);
    }
    return { user: toAdminUserRow(row) };
  } finally {
    client.release();
  }
}

export async function updateUser(adminUserId, targetUserId, dto) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const before = await adminUserRepository.findAdminUserById(client, targetUserId);
    if (!before) {
      throw new AppError('User not found', 404);
    }

    if (before.role === USER_ROLES.ADMIN && dto.role) {
      throw new AppError('Cannot change role of an ADMIN account via API', 403);
    }

    if (dto.role === USER_ROLES.ADMIN) {
      throw new AppError('Cannot assign ADMIN role via API', 403);
    }

    const updated = await adminUserRepository.updateUserAdmin(
      client,
      targetUserId,
      dto,
    );

    const audit = await writeAudit(client, {
      adminUserId,
      action: ADMIN_AUDIT_ACTIONS.USER_UPDATE,
      targetType: ADMIN_AUDIT_TARGET_TYPES.USER,
      targetId: String(targetUserId),
      payload: {
        before: { role: before.role, status: before.status },
        after: { role: updated.role, status: updated.status },
      },
    });

    await client.query('COMMIT');

    const row = await adminUserRepository.findAdminUserById(client, targetUserId);
    return {
      message: 'User updated',
      user: toAdminUserRow(row),
      audit,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getSettings() {
  const client = await pool.connect();
  try {
    const settings = await settingsRepository.getCachedSettings(redis, client);
    return { settings };
  } finally {
    client.release();
  }
}

export async function patchSettings(adminUserId, dto) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const before = await settingsRepository.getCachedSettings(redis, client);
    const updates = [];

    if (dto.commissionRatePercent !== undefined) {
      updates.push(
        settingsRepository.upsertSetting(
          client,
          SYSTEM_SETTING_KEYS.COMMISSION_RATE_PERCENT,
          dto.commissionRatePercent,
          adminUserId,
        ),
      );
    }

    if (dto.paymentGateways !== undefined) {
      const currentGateways = before.paymentGateways || {
        momo: { enabled: false },
        vnpay: { enabled: false },
      };
      const merged = {
        momo: {
          enabled:
            dto.paymentGateways.momo?.enabled ??
            currentGateways.momo?.enabled ??
            false,
        },
        vnpay: {
          enabled:
            dto.paymentGateways.vnpay?.enabled ??
            currentGateways.vnpay?.enabled ??
            false,
        },
      };
      updates.push(
        settingsRepository.upsertSetting(
          client,
          SYSTEM_SETTING_KEYS.PAYMENT_GATEWAYS,
          merged,
          adminUserId,
        ),
      );
    }

    if (dto.otpExpirySeconds !== undefined) {
      updates.push(
        settingsRepository.upsertSetting(
          client,
          SYSTEM_SETTING_KEYS.OTP_EXPIRY_SECONDS,
          dto.otpExpirySeconds,
          adminUserId,
        ),
      );
    }

    if (dto.defaultCancellationWindowHours !== undefined) {
      updates.push(
        settingsRepository.upsertSetting(
          client,
          SYSTEM_SETTING_KEYS.DEFAULT_CANCELLATION_WINDOW_HOURS,
          dto.defaultCancellationWindowHours,
          adminUserId,
        ),
      );
    }

    await Promise.all(updates);

    await settingsRepository.invalidateSettingsCache(redis);

    const audit = await writeAudit(client, {
      adminUserId,
      action: ADMIN_AUDIT_ACTIONS.SETTINGS_UPDATE,
      targetType: ADMIN_AUDIT_TARGET_TYPES.SYSTEM_SETTING,
      targetId: 'global',
      payload: { before, patch: dto },
    });

    await client.query('COMMIT');

    const settings = await settingsRepository.getCachedSettings(redis, client);
    return {
      message: 'Settings updated',
      settings,
      audit,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getDashboardSummary(query) {
  const client = await pool.connect();
  try {
    const [registrations, bookingRevenue, matchRevenue, totalUsers, pendingApprovals] =
      await Promise.all([
        adminUserRepository.countRegistrationsByDay(client, {
          days: query.registrationDays,
          role: query.role,
        }),
        adminUserRepository.sumBookingRevenue(client),
        adminUserRepository.sumMatchmakingRevenue(client),
        adminUserRepository.countUsers(client),
        adminUserRepository.countPendingApprovals(client),
      ]);

    const revenueTotal = bookingRevenue + matchRevenue;

    return {
      summary: {
        totalUsers,
        pendingApprovals,
        revenueTotal,
        revenueCurrency: 'VND',
        revenueBreakdown: {
          bookings: bookingRevenue,
          matchmaking: matchRevenue,
        },
        revenueSource:
          revenueTotal > 0 ? 'bookings+matchmaking' : 'stub',
      },
      userRegistrations: registrations.map((row) => ({
        day: row.day,
        count: row.count,
      })),
    };
  } finally {
    client.release();
  }
}

export async function listAuditLog(query) {
  const client = await pool.connect();
  try {
    const { rows, total } = await auditRepository.listRecent(client, query);
    return {
      items: rows.map(toAuditLogRow),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  } finally {
    client.release();
  }
}
