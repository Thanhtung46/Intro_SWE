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
    avatarUrl: row.avatar_url ?? null,
    language: row.language ?? 'en',
    appearance: row.appearance ?? 'light',
    pushNotificationsEnabled:
      row.push_notifications_enabled === undefined
        ? true
        : Boolean(row.push_notifications_enabled),
    locationServicesEnabled:
      row.location_services_enabled === undefined
        ? true
        : Boolean(row.location_services_enabled),
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

/** Settings prefs subset (sync across devices via DB). */
export function toPublicPreferences(row) {
  if (!row) return null;
  const user = toPublicUser(row);
  return {
    language: user.language,
    appearance: user.appearance,
    pushNotificationsEnabled: user.pushNotificationsEnabled,
    locationServicesEnabled: user.locationServicesEnabled,
  };
}
