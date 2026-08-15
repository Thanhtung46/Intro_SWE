import type { DocumentPickerAsset } from 'expo-document-picker';
import { z } from 'zod';

// Per PA/PA1.md UC U009 "Submit Business License" — docs don't give exact
// numbers, so these are our own reasonable defaults for the mock stage.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export const ownerRegisterSchema = z.object({
  // Matches schema_venue.venues.name (PA/PA2.md) — no venue-level phone
  // column exists there; the owner's phone is already on the `users`
  // record from account signup, so it isn't re-collected here.
  venueName: z.string().trim().min(2, 'Venue name must be at least 2 characters.'),
  // Matches schema_venue.venues.address.
  address: z.string().trim().min(5, 'Address must be at least 5 characters.'),
  // Per UC U008's main scenario: "business information (name, address,
  // contact person)" — may differ from the account holder (e.g. a
  // manager), so it's its own field rather than reusing the account name.
  contactPerson: z.string().trim().min(2, 'Contact person name must be at least 2 characters.'),
  // Per UC U009's alternative flow: "Missing license document -> System
  // blocks submission until a valid license file is attached." Picked via
  // expo-document-picker's imperative async picker, then pushed into the
  // form with react-hook-form's `setValue` (not a controlled input, so
  // not wired through <Controller>) — this field only validates that
  // *something already picked* is present and within limits.
  licenseDocument: z
    .custom<DocumentPickerAsset>()
    .nullable()
    .refine((file) => file !== null && file !== undefined, 'Please attach your business license.')
    .refine(
      (file) => !file || (file.size ?? 0) <= MAX_FILE_SIZE_BYTES,
      'File must be 5MB or smaller.',
    )
    .refine(
      (file) => !file || !file.mimeType || ACCEPTED_MIME_TYPES.includes(file.mimeType),
      'Only PDF, JPG, or PNG files are accepted.',
    ),
});

// `.refine()`'s null-check narrows zod's *output* type to non-null (the
// validated, submit-ready shape — used as `RegisterOwnerPayload`). The
// form's live runtime state starts with `licenseDocument: null` before
// anything is picked, so it needs the wider *input* type instead — hence
// two exports rather than one.
export type OwnerRegisterFormValues = z.output<typeof ownerRegisterSchema>;
export type OwnerRegisterFormInput = z.input<typeof ownerRegisterSchema>;
