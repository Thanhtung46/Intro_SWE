export function toPublicUser(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    role: row.role,
    status: row.status,
    gender: row.gender ?? undefined,
    roleSelected: Boolean(row.role_selected_at),
    roleSelectedAt: row.role_selected_at ?? null,
    emailVerified: Boolean(row.email_verified_at),
    createdAt: row.created_at,
  };
}
