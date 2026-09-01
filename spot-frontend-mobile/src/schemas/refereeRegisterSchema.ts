import type { DocumentPickerAsset } from 'expo-document-picker';
import { z } from 'zod';

// Referee signup — 3 documents for POST /users/me/verification-requests/batch
// (spot-backend: exactly one each of ID_FRONT / ID_BACK / VFF_LICENSE).
// Same imperative-picker + setValue pattern as ownerRegisterSchema.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];
const LICENSE_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function documentField(label: string, acceptedTypes: string[]) {
  return z
    .custom<DocumentPickerAsset>()
    .nullable()
    .refine((file) => file !== null && file !== undefined, `Please attach your ${label}.`)
    .refine((file) => !file || (file.size ?? 0) <= MAX_FILE_SIZE_BYTES, 'File must be 5MB or smaller.')
    .refine(
      (file) => !file || !file.mimeType || acceptedTypes.includes(file.mimeType),
      acceptedTypes.includes('application/pdf')
        ? 'Only JPG, PNG, or PDF files are accepted.'
        : 'Only JPG or PNG files are accepted.'
    );
}

export const refereeRegisterSchema = z.object({
  idFront: documentField('ID card front', IMAGE_MIME_TYPES),
  idBack: documentField('ID card back', IMAGE_MIME_TYPES),
  vffLicense: documentField('VFF national license', LICENSE_MIME_TYPES),
});

// output = validated, all three non-null (submit-ready); input = live form
// state, which starts null before anything is picked.
export type RefereeRegisterFormValues = z.output<typeof refereeRegisterSchema>;
export type RefereeRegisterFormInput = z.input<typeof refereeRegisterSchema>;
