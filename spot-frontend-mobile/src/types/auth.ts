export type Role = 'player' | 'owner' | 'referee';

export type RegistrationStatus = 'pending';

// Per .claude/rules/form-conventions.md: payload types are re-exports of
// the form schema's inferred type, never hand-duplicated (that drift is
// exactly what broke the build on this branch).
export type { OwnerRegisterFormValues as RegisterOwnerPayload } from '@/schemas/ownerRegisterSchema';

// RegisterRefereePayload removed (SPOT-93): referee signup submits 3
// verification documents, not a flat payload — see
// src/schemas/refereeRegisterSchema.ts + refereeService.ts.

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
