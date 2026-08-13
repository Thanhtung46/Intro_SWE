import type { OwnerRegisterFormValues } from '@/schemas/ownerRegisterSchema';

export type Role = 'player' | 'owner' | 'referee';

export type RegistrationStatus = 'pending';

// The zod schema is the source of truth for this payload's shape — alias
// it here instead of hand-duplicating the fields, so schema and type can't
// drift apart.
export type RegisterOwnerPayload = OwnerRegisterFormValues;

export type RegisterRefereePayload = {
  fullName: string;
  phone: string;
  certification: string;
};

export type RegisterResponse = {
  status: RegistrationStatus;
};
