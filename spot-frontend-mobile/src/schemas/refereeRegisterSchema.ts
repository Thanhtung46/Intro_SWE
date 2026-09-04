import type { DocumentPickerAsset } from 'expo-document-picker';
import { z } from 'zod';

// Referee signup — 3 documents for POST /users/me/verification-requests/batch
// (spot-backend: exactly one each of ID_FRONT / ID_BACK / VFF_LICENSE).
// Each document can be provided EITHER by picking a file (`<key>` asset) OR by
// pasting a public http(s) URL (`<key>Url`). The paste field is the working
// path until a real file-upload pipeline exists (uploadRefereeDocument is a
// stub). Validation is cross-field via `.superRefine`, since the zod resolver
// only sees the form fields — not a sibling `useState`.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];
const LICENSE_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const assetOrNull = z.custom<DocumentPickerAsset>().nullable();

export const refereeRegisterSchema = z
  .object({
    idFront: assetOrNull,
    idFrontUrl: z.string(),
    idBack: assetOrNull,
    idBackUrl: z.string(),
    vffLicense: assetOrNull,
    vffLicenseUrl: z.string(),
  })
  .superRefine((v, ctx) => {
    const docs: {
      key: 'idFront' | 'idBack' | 'vffLicense';
      label: string;
      asset: DocumentPickerAsset | null;
      url: string;
      accepted: string[];
    }[] = [
      { key: 'idFront', label: 'ID card front', asset: v.idFront, url: v.idFrontUrl, accepted: IMAGE_MIME_TYPES },
      { key: 'idBack', label: 'ID card back', asset: v.idBack, url: v.idBackUrl, accepted: IMAGE_MIME_TYPES },
      {
        key: 'vffLicense',
        label: 'VFF national license',
        asset: v.vffLicense,
        url: v.vffLicenseUrl,
        accepted: LICENSE_MIME_TYPES,
      },
    ];

    for (const { key, label, asset, url, accepted } of docs) {
      const trimmedUrl = url.trim();

      if (!asset && trimmedUrl === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `Please attach your ${label}.` });
        continue;
      }

      if (asset) {
        if ((asset.size ?? 0) > MAX_FILE_SIZE_BYTES) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'File must be 5MB or smaller.' });
        }
        if (asset.mimeType && !accepted.includes(asset.mimeType)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: accepted.includes('application/pdf')
              ? 'Only JPG, PNG, or PDF files are accepted.'
              : 'Only JPG or PNG files are accepted.',
          });
        }
      }

      if (trimmedUrl !== '' && !/^https?:\/\//i.test(trimmedUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`${key}Url`],
          message: 'Enter a valid http(s) URL.',
        });
      }
    }
  });

// output = validated (each doc has an asset or a URL); input = live form state.
export type RefereeRegisterFormValues = z.output<typeof refereeRegisterSchema>;
export type RefereeRegisterFormInput = z.input<typeof refereeRegisterSchema>;
