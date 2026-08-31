import { z } from 'zod';

// Mirrors spot-backend/src/shared/constants/auth.js's VN_PHONE_REGEX — no FE
// copy of this exists yet, so it's duplicated here rather than imported
// (this app has no shared package with the backend).
const VN_PHONE_REGEX = /^0(2|3|5|7|8|9)[0-9]{8}$/;
const VN_PHONE_MESSAGE =
  'Phone number must be a valid Vietnamese number (10 digits, starting with 02, 03, 05, 07, 08, or 09)';

const phoneNumber = z.string().trim().regex(VN_PHONE_REGEX, VN_PHONE_MESSAGE);

// Mirrors spot-backend/src/domains/matchmaking/dto/join-match.dto.js's
// guestSchema exactly — keep in sync if that file changes.
const guestSchema = z.object({
  name: z.string().trim().min(1, 'Guest name is required').max(80, 'Guest name must be at most 80 characters'),
  skill: z.string().trim().min(1, 'Guest skill is required'),
  gender: z.enum(['female', 'male'], { message: 'Guest gender must be female or male' }),
  phoneNumber,
});

// No async/imperative field (unlike ownerRegisterSchema.ts's
// licenseDocument), but `guests`'s `.default([])` still makes it optional
// on *input* (react-hook-form's live state, before submit) and required on
// *output* (the validated, submit-ready shape) — same input/output split
// rule as form-conventions.md describes, just triggered by `.default()`
// instead of an async field's `.refine()`.
export const joinMatchSchema = z.object({
  message: z.string().trim().max(500, 'Message must be at most 500 characters').optional(),
  // Per-join contact override — distinct from the profile's phone, see
  // SPOT-76 plan mục 2.2. Optional: an empty field means "use my account
  // phone" (the backend falls back to it), so accept '' and normalise it to
  // undefined rather than running it through the VN-phone regex — otherwise
  // hitting "Send Request" without touching the field 400s on a blank string.
  phoneNumber: z
    .union([phoneNumber, z.literal('')])
    .optional()
    .transform((value) => value || undefined),
  guests: z.array(guestSchema).max(10, 'At most 10 guests').default([]),
});

export type JoinMatchFormValues = z.output<typeof joinMatchSchema>;
export type JoinMatchFormInput = z.input<typeof joinMatchSchema>;
export type JoinMatchGuestFormValues = z.infer<typeof guestSchema>;
