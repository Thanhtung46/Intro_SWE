export function toVerificationRequestRow(row) {
  if (!row) return null;
  return {
    verificationReqId: row.verification_req_id,
    userId: row.user_id,
    requestType: row.request_type,
    documentUrl: row.document_url,
    documentKind: row.document_kind ?? null,
    status: row.status,
    adminNotes: row.admin_notes ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    applicant: row.email
      ? {
          userId: row.user_id,
          email: row.email,
          phoneNumber: row.phone_number,
          role: row.role,
          status: row.user_status,
          fullName: row.full_name ?? null,
        }
      : undefined,
  };
}

export function toAuditLogRow(row) {
  if (!row) return null;
  return {
    auditId: row.audit_id,
    adminUserId: row.admin_user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    payload: row.payload ?? null,
    createdAt: row.created_at,
    adminEmail: row.admin_email ?? null,
  };
}

export function toAdminUserRow(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    email: row.email,
    phoneNumber: row.phone_number,
    role: row.role,
    status: row.status,
    fullName: row.full_name ?? null,
    gender: row.gender ?? null,
    avatarUrl: row.avatar_url ?? null,
    emailVerifiedAt: row.email_verified_at ?? null,
    roleSelectedAt: row.role_selected_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
