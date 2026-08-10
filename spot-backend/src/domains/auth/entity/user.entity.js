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
    createdAt: row.created_at,
  };
}
