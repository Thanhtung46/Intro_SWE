export type Role = 'player' | 'owner' | 'referee';

export type RegistrationStatus = 'pending';

export type RegisterOwnerPayload = {
  venueName: string;
  address: string;
  phone: string;
};

export type RegisterRefereePayload = {
  fullName: string;
  phone: string;
  certification: string;
};

export type RegisterResponse = {
  status: RegistrationStatus;
};

// GET /auth/me — the current user's own full profile. Distinct from
// LoginUser (src/services/authService.ts), which is just the login
// response's session shape and has no gender/skills/avatarUrl. Needed by
// the Join Match sheet's "You" card (SPOT-76 plan mục 2.2 — Gender/Skill
// shown read-only here, only Phone + Message are editable per-join).
export type CurrentUserProfile = {
  userId: string;
  fullName: string;
  phoneNumber?: string;
  gender?: string;
  avatarUrl: string | null;
  skills: Record<string, string | null>; // { badminton: code|null, football: code|null }
};
