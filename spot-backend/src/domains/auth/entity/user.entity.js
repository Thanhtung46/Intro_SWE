import { emptySkills, SPORT_JSON_KEYS } from '../../../shared/constants/sports.js';

export function skillsFromRows(skillRows = []) {
  const skills = emptySkills();
  for (const row of skillRows) {
    const key = SPORT_JSON_KEYS[row.sport];
    if (key) {
      skills[key] = row.skill_level;
    }
  }
  return skills;
}

export function toPublicUser(row, skillRows = []) {
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
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
    skills: skillsFromRows(skillRows),
  };
}

/** Public host/player card — no email, phone, or account internals. */
export function toPublicHostProfile(row, skillRows = [], { matchCount = 0 } = {}) {
  if (!row) return null;
  return {
    userId: row.user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
    skills: skillsFromRows(skillRows),
    matchCount,
    rating: null,
    reviewCount: 0,
  };
}
