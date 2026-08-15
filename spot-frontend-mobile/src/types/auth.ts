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
